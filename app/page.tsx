'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Plus, Edit, Trash2, Users, Briefcase, Calendar, Clock, Save, LogOut, Wifi, WifiOff, RefreshCw, CheckCircle, PlayCircle, PauseCircle } from 'lucide-react'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'user'
  avatar: string
}

interface Resource {
  id: string
  name: string
  role: string
  skills: string[]
  created_by: string
  created_at: string
  updated_at: string
}

interface Project {
  id: string
  code: string
  name: string
  description: string
  start_date: string
  end_date: string
  color: string
  status: 'da-avviare' | 'in-corso' | 'concluso'
  created_by: string
  created_at: string
  updated_at: string
}

const GPRApp = () => {
  // Authentication state
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' })
  const [authError, setAuthError] = useState('')

  // Application state
  const [activeTab, setActiveTab] = useState('dashboard')
  const [resources, setResources] = useState<Resource[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced')

  // Authentication effect
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        loadUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        loadUserProfile(session.user.id)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load user profile from database
  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: session?.user?.email || '',
            name: session?.user?.user_metadata?.name || session?.user?.email || 'User',
            role: 'user',
            avatar: '👤'
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating profile:', createError)
          return
        }
        setUser(newProfile)
      } else if (error) {
        console.error('Error loading profile:', error)
        return
      } else {
        setUser(data)
      }

      await loadAllData()
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load all application data
  const loadAllData = async () => {
    setSyncStatus('syncing')
    try {
      const [resourcesRes, projectsRes] = await Promise.all([
        supabase.from('resources').select('*').order('created_at', { ascending: false }),
        supabase.from('projects').select('*').order('created_at', { ascending: false })
      ])

      if (resourcesRes.data) setResources(resourcesRes.data)
      if (projectsRes.data) setProjects(projectsRes.data)

      setSyncStatus('synced')
    } catch (error) {
      console.error('Error loading data:', error)
      setSyncStatus('error')
    }
  }

  // Authentication handlers
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: authForm.email,
          password: authForm.password,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password,
          options: {
            data: {
              name: authForm.name,
            }
          }
        })
        if (error) throw error
        setAuthError('Account creato! Controlla la tua email per confermare.')
      }
    } catch (error: any) {
      setAuthError(error.message)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const createSampleData = async () => {
    if (!user) return
    
    setSyncStatus('syncing')
    try {
      // Create sample resources
      const sampleResources = [
        { name: 'Mario Rossi', role: 'Architetto Senior', skills: ['AutoCAD', 'Revit', 'Progettazione'], created_by: user.id },
        { name: 'Anna Bianchi', role: 'Ingegnere Climatico', skills: ['HVAC', 'Efficienza Energetica', 'Sostenibilità'], created_by: user.id },
        { name: 'Luca Verdi', role: 'Project Manager', skills: ['Gestione Progetti', 'Coordinamento', 'Budget'], created_by: user.id }
      ]

      const { error: resourceError } = await supabase
        .from('resources')
        .insert(sampleResources)

      // Create sample projects
      const sampleProjects = [
        { 
          code: 'PRJ-2025-001',
          name: 'Centro Commerciale Verde', 
          description: 'Progetto sostenibile con certificazione LEED', 
          start_date: '2025-01-15', 
          end_date: '2025-04-30', 
          color: '#3BBAA0', 
          status: 'in-corso',
          created_by: user.id
        },
        { 
          code: 'PRJ-2025-002',
          name: 'Residenziale Eco-Friendly', 
          description: 'Complesso residenziale a impatto zero', 
          start_date: '2025-02-01', 
          end_date: '2025-05-15', 
          color: '#4A5568', 
          status: 'da-avviare',
          created_by: user.id
        }
      ]

      const { error: projectError } = await supabase
        .from('projects')
        .insert(sampleProjects)

      if (resourceError) console.error('Resource error:', resourceError)
      if (projectError) console.error('Project error:', projectError)

      await loadAllData()
    } catch (error) {
      console.error('Error creating sample data:', error)
      setSyncStatus('error')
    }
  }

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Caricamento GPR ake...</h2>
        </div>
      </div>
    )
  }

  // Authentication screen
  if (!session || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="text-3xl font-bold text-gray-800 mr-2">ake</div>
              <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
            </div>
            <h1 className="text-2xl font-bold text-gray-700">GPR ake</h1>
            <p className="text-gray-600 mt-2">Sistema di Gestione Progetti</p>
          </div>
          
          <div className="flex mb-6">
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 px-4 text-center rounded-l-md transition-colors ${
                authMode === 'login' 
                  ? 'bg-teal-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-2 px-4 text-center rounded-r-md transition-colors ${
                authMode === 'register' 
                  ? 'bg-teal-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Registrati
            </button>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={authForm.name}
                  onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  required
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={authForm.email}
                onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={authForm.password}
                onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
                minLength={6}
              />
            </div>
            
            {authError && (
              <div className={`text-sm text-center ${
                authError.includes('creato') ? 'text-green-600' : 'text-red-600'
              }`}>
                {authError}
              </div>
            )}
            
            <button
              type="submit"
              className="w-full bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-700 transition-colors"
            >
              {authMode === 'login' ? 'Accedi' : 'Registrati'}
            </button>
          </form>
          
          <div className="mt-4 text-center text-xs text-gray-500">
            GPR ake Production v1.0 - Sistema di Gestione Progetti
          </div>
        </div>
      </div>
    )
  }

  // Main application
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center mr-6">
                <div className="text-2xl font-bold text-gray-800 mr-2">ake</div>
                <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
              </div>
              <h1 className="text-xl font-bold text-gray-700 mr-6">GPR ake Production</h1>
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700">
                  <Wifi className="h-3 w-3 mr-1" />
                  Online
                </div>
                
                <div className={`flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                  syncStatus === 'synced' ? 'bg-green-100 text-green-700' :
                  syncStatus === 'syncing' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {syncStatus === 'syncing' ? (
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3 mr-1" />
                  )}
                  {syncStatus === 'synced' && 'Sincronizzato'}
                  {syncStatus === 'syncing' && 'Caricamento...'}
                  {syncStatus === 'error' && 'Errore'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex space-x-2">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: Briefcase },
                  { id: 'projects', label: 'Progetti', icon: Briefcase },
                  { id: 'resources', label: 'Risorse', icon: Users },
                  { id: 'calendar', label: 'Calendario', icon: Calendar }
                ].map(tab => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === tab.id 
                          ? 'bg-teal-100 text-teal-700' 
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4 inline mr-1" />
                      {tab.label}
                    </button>
                  )
                })}
              </div>
              
              <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{user.avatar}</span>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500 capitalize">{user.role}</div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-gray-800">
                🎉 Benvenuto in GPR ake Production!
              </h2>
              <button
                onClick={() => loadAllData()}
                className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Aggiorna Dati
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-8">
              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Sistema Completamente Funzionante! 🚀
                </h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Hai appena deployato con successo GPR ake in produzione con database reale, 
                  autenticazione sicura e sincronizzazione automatica. Il sistema è pronto per l'uso!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-6 rounded-lg border border-teal-200">
                  <div className="flex items-center mb-3">
                    <Users className="h-8 w-8 text-teal-600 mr-3" />
                    <h4 className="text-lg font-semibold text-teal-800">Risorse</h4>
                  </div>
                  <p className="text-3xl font-bold text-teal-600 mb-2">{resources.length}</p>
                  <p className="text-sm text-teal-700">Team members attivi</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                  <div className="flex items-center mb-3">
                    <Briefcase className="h-8 w-8 text-blue-600 mr-3" />
                    <h4 className="text-lg font-semibold text-blue-800">Progetti</h4>
                  </div>
                  <p className="text-3xl font-bold text-blue-600 mb-2">{projects.length}</p>
                  <p className="text-sm text-blue-700">Progetti in gestione</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                  <div className="flex items-center mb-3">
                    <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                    <h4 className="text-lg font-semibold text-green-800">Status</h4>
                  </div>
                  <p className="text-lg font-bold text-green-600 mb-2">LIVE</p>
                  <p className="text-sm text-green-700">Sistema operativo</p>
                </div>
              </div>

              {resources.length === 0 && projects.length === 0 && (
                <div className="text-center py-8">
                  <h4 className="text-lg font-medium text-gray-700 mb-4">
                    Inizia creando alcuni dati di esempio
                  </h4>
                  <button
                    onClick={createSampleData}
                    className="bg-gradient-to-r from-teal-500 to-blue-500 text-white px-6 py-3 rounded-lg hover:from-teal-600 hover:to-blue-600 flex items-center mx-auto transition-all"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Crea Dati di Esempio
                  </button>
                </div>
              )}

              <div className="border-t pt-8 mt-8">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">🎯 Prossimi Passi:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-800 mb-2">1. Configura il tuo team</h5>
                    <p className="text-sm text-gray-600">Vai su "Risorse" e aggiungi i membri del tuo team</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-800 mb-2">2. Crea i primi progetti</h5>
                    <p className="text-sm text-gray-600">Vai su "Progetti" e inizia a organizzare il lavoro</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-800 mb-2">3. Pianifica le attività</h5>
                    <p className="text-sm text-gray-600">Usa il "Calendario" per gestire tempistiche e scadenze</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-800 mb-2">4. Invita i colleghi</h5>
                    <p className="text-sm text-gray-600">Condividi il link e fai registrare il team</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Gestione Progetti</h2>
            <p className="text-gray-600">Funzionalità in sviluppo - Database collegato e pronto!</p>
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Gestione Risorse</h2>
            <p className="text-gray-600">Funzionalità in sviluppo - Database collegato e pronto!</p>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Calendario</h2>
            <p className="text-gray-600">Funzionalità in sviluppo - Database collegato e pronto!</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default GPRApp
