import { useEffect, useState } from 'react'
import './App.css'
import { AuthProvider, useAuth } from './context/AuthContext'
import { participantAPI } from './api/apiClient'
import Landing from './landing'
import Login from './login'
import OrganizerLogin from './organizer-login'
import AdminLogin from './admin-login'
import Signup from './signup-page'
import ParticipantDashboard from './components/ParticipantDashboard'
import OrganizerDashboard from './components/OrganizerDashboard'
import AdminDashboard from './components/AdminDashboard'
import BrowseEvents from './pages/BrowseEvents'
import EventDetails from './pages/EventDetails'
import ParticipantProfile from './pages/ParticipantProfile'
import Clubs from './pages/Clubs'
import OrganizerDetail from './pages/OrganizerDetail'
import ParticipantPreferences from './pages/ParticipantPreferences'
import FollowOrganizers from './pages/FollowOrganizers'
import CreateEvent from './pages/CreateEvent'
import OrganizerProfile from './pages/OrganizerProfile'
import OngoingEvents from './pages/OngoingEvents'
import AttendanceDashboard from './pages/AttendanceDashboard'
import ForumPage from './pages/ForumPage'

function AppContent() {
  const { user, token, loading, updateUser } = useAuth()
  const [currentPage, setCurrentPage] = useState(() => {
    return localStorage.getItem('currentPage') || 'landing'
  })
  const [error, setError] = useState(null)
  const [selectedEventId, setSelectedEventId] = useState(() => {
    return localStorage.getItem('selectedEventId') || null
  })
  const [selectedOrganizerId, setSelectedOrganizerId] = useState(() => {
    return localStorage.getItem('selectedOrganizerId') || null
  })
  const [isInitialized, setIsInitialized] = useState(false)


  useEffect(() => {
    localStorage.setItem('currentPage', currentPage)
  }, [currentPage])


  useEffect(() => {
    if (selectedEventId) {
      localStorage.setItem('selectedEventId', selectedEventId)
    } else {
      localStorage.removeItem('selectedEventId')
    }
  }, [selectedEventId])


  useEffect(() => {
    if (selectedOrganizerId) {
      localStorage.setItem('selectedOrganizerId', selectedOrganizerId)
    } else {
      localStorage.removeItem('selectedOrganizerId')
    }
  }, [selectedOrganizerId])


  useEffect(() => {
    if (loading) return

    if (!isInitialized && token && user) {
      setIsInitialized(true)


      if (user.role === 'participant' && !user.onboardingCompleted) {
        setCurrentPage('participant-preferences')
        return
      }


      const publicPages = [
        'landing',
        'login',
        'organizer-login',
        'admin-login',
        'signup'
      ]

      if (publicPages.includes(currentPage)) {
        setCurrentPage('dashboard')
      }
    } else if (!loading && !token && !isInitialized) {
      setIsInitialized(true)
      localStorage.removeItem('currentPage')
      setCurrentPage('landing')
    }
  }, [token, user, loading, isInitialized])


  useEffect(() => {
    if (token && user && !loading && isInitialized) {

      const publicPages = [
        'landing',
        'login',
        'organizer-login',
        'admin-login',
        'signup'
      ]

      if (publicPages.includes(currentPage)) {
        if (user.role === 'participant' && !user.onboardingCompleted) {
          setCurrentPage('participant-preferences')
        } else {
          setCurrentPage('dashboard')
        }
      }
    }
  }, [token, user, loading, isInitialized, currentPage])


  const handleGoToLogin = () => setCurrentPage('login')
  const handleGoToOrganizerLogin = () => setCurrentPage('organizer-login')
  const handleGoToAdminLogin = () => setCurrentPage('admin-login')
  const handleGoToSignup = () => setCurrentPage('signup')
  const handleGoToLanding = () => setCurrentPage('landing')
  const handleGoToBrowseEvents = () => setCurrentPage('browse-events')
  const handleGoToEventDetails = (eventId) => {
    setSelectedEventId(eventId)
    setCurrentPage('event-details')
  }
  const handleGoToOrganizerDetail = (organizerId) => {
    setSelectedOrganizerId(organizerId)
    setCurrentPage('organizer-detail')
  }
  const handleNavigate = (page, eventId) => {
    if (eventId) {
      setSelectedEventId(eventId)
    }
    setCurrentPage(page)
  }


  if (error) {
    return (
      <div className="loading-container">
        <div>
          <h2>Something went wrong</h2>
          <p>{error.toString()}</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      </div>
    )
  }

  try {
    if (token && user) {

      if (user.role === 'participant') {
        if (!user.onboardingCompleted) {
          if (currentPage === 'follow-organizers') {
            return (
              <FollowOrganizers
                onComplete={async () => {
                  // Complete onboarding
                  try {
                    await participantAPI.skipOnboarding();
                    updateUser({ onboardingCompleted: true });
                  } catch (err) {
                    console.error('Failed to complete onboarding:', err);
                  }
                  setCurrentPage('dashboard');
                }}
                onSkip={async () => {

                  try {
                    await participantAPI.skipOnboarding();
                    updateUser({ onboardingCompleted: true });
                  } catch (err) {
                    console.error('Failed to skip onboarding:', err);
                  }
                  setCurrentPage('dashboard');
                }}
              />
            );
          }

          return (
            <ParticipantPreferences
              onNext={() => setCurrentPage('follow-organizers')}
            />
          );
        }

        if (currentPage === 'browse-events') {
          return (
            <BrowseEvents
              onEventClick={handleGoToEventDetails}
              onBack={() => setCurrentPage('dashboard')}
            />
          )
        }

        if (currentPage === 'event-details') {
          return (
            <EventDetails
              eventId={selectedEventId}
              onBack={() => setCurrentPage('browse-events')}
            />
          )
        }

        if (currentPage === 'participant-profile') {
          return <ParticipantProfile onBack={() => setCurrentPage('dashboard')} />
        }

        if (currentPage === 'clubs') {
          return <Clubs onBack={() => setCurrentPage('dashboard')} onOrganizerClick={handleGoToOrganizerDetail} />
        }

        if (currentPage === 'organizer-detail') {
          return <OrganizerDetail organizerId={selectedOrganizerId} onBack={() => setCurrentPage('clubs')} onEventClick={handleGoToEventDetails} />
        }

        return <ParticipantDashboard onNavigate={handleNavigate} />
      }

      if (user.role === 'organizer') {
        if (currentPage === 'create-event') {
          return (
            <CreateEvent
              onBack={() => setCurrentPage('dashboard')}
              onCreated={() => setCurrentPage('dashboard')}
            />
          )
        }
        if (currentPage === 'ongoing-events') {
          return (
            <OngoingEvents
              onBack={() => setCurrentPage('dashboard')}
              onCreate={() => setCurrentPage('create-event')}
              onAttendance={(eventId) => {
                setSelectedEventId(eventId);
                setCurrentPage('attendance');
              }}
            />
          )
        }
        if (currentPage === 'organizer-profile') {
          return <OrganizerProfile onBack={() => setCurrentPage('dashboard')} />
        }
        if (currentPage === 'attendance') {
          return (
            <AttendanceDashboard
              eventId={selectedEventId}
              onBack={() => setCurrentPage('ongoing-events')}
            />
          )
        }
        if (currentPage === 'event-details') {
          return (
            <EventDetails
              eventId={selectedEventId}
              onBack={() => setCurrentPage('ongoing-events')}
              isOrganizerView={true}
            />
          )
        }
        if (currentPage === 'forum') {
          return (
            <ForumPage
              eventId={selectedEventId}
              onBack={() => setCurrentPage('dashboard')}
            />
          )
        }
        return <OrganizerDashboard onNavigate={handleNavigate} onEventClick={handleGoToEventDetails} />
      }

      if (user.role === 'admin') {
        if (currentPage === 'manage-organizers') {
          return <AdminDashboard onNavigate={handleNavigate} activeView="manage-organizers" />
        }
        if (currentPage === 'password-resets') {
          return <AdminDashboard onNavigate={handleNavigate} activeView="password-resets" />
        }
        return <AdminDashboard onNavigate={handleNavigate} activeView="dashboard" />
      }
    }

    return (
      <>
        {currentPage === 'landing' && (
          <Landing
            onLoginClick={handleGoToLogin}
            onSignupClick={handleGoToSignup}
          />
        )}
        {currentPage === 'login' && (
          <Login
            onBack={handleGoToLanding}
            onSignup={handleGoToSignup}
            onOrganizerClick={handleGoToOrganizerLogin}
            onAdminClick={handleGoToAdminLogin}
          />
        )}
        {currentPage === 'organizer-login' && (
          <OrganizerLogin
            onBack={handleGoToLanding}
          />
        )}
        {currentPage === 'admin-login' && (
          <AdminLogin
            onBack={handleGoToLanding}
          />
        )}
        {currentPage === 'signup' && (
          <Signup
            onBack={handleGoToLogin}
          />
        )}
        {currentPage === 'browse-events' && (
          <BrowseEvents
            onEventClick={handleGoToEventDetails}
            onBack={handleGoToLanding}
          />
        )}
        {currentPage === 'event-details' && (
          <EventDetails
            eventId={selectedEventId}
            onBack={handleGoToBrowseEvents}
          />
        )}
        {currentPage === 'participant-profile' && (
          <ParticipantProfile
            onBack={handleGoToLanding}
          />
        )}
        {currentPage === 'clubs' && (
          <Clubs
            onBack={handleGoToLanding}
          />
        )}
      </>
    )
  } catch (err) {
    console.error('Render error:', err);
    return (
      <div className="loading-container">
        <div>
          <h2>Something went wrong</h2>
          <p>{err?.message || err?.toString() || 'An unexpected error occurred'}</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      </div>
    );
  }
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App;
