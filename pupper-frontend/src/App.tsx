import {BrowserRouter as Router, Routes, Route, Link} from 'react-router-dom';
import './App.css'
import {Authenticator} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import {Amplify} from 'aws-amplify';
import {Button, Box, Typography, ThemeProvider, createTheme, CssBaseline} from '@mui/material';
import {Pets, Home as HomeIcon, Add as AddIcon, Logout as LogoutIcon, Menu as MenuIcon, Close as CloseIcon} from '@mui/icons-material';
import {useState, useEffect} from 'react';
import {Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton} from '@mui/material';
import { getCurrentUser } from 'aws-amplify/auth';
import Home from './components/Home';
import DogDetail from "./components/DogDetail";
import CreateDog from './components/CreateDog';
import CreateDogShelter from './components/CreateDogShelter';
import ExtractText from './components/ExtractText';
import DogMatcher from './components/DogMatcher';
import MyDogs from './components/MyDogs';

// Router component to choose between regular and shelter create dog
const CreateDogRouter = () => {
    const [userType, setUserType] = useState<string | null>(null);
    
    useEffect(() => {
        const checkUserType = async () => {
            try {
                const { fetchUserAttributes } = await import('aws-amplify/auth');
                const attributes = await fetchUserAttributes();
                setUserType(attributes['custom:user_type'] || 'regular');
            } catch (error) {
                setUserType('regular');
            }
        };
        checkUserType();
    }, []);
    
    if (userType === 'shelter') {
        return <CreateDogShelter />;
    }
    
    return <CreateDog />;
};

// Create a custom theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1B3C53',
      light: '#456882',
      dark: '#0f2a3a',
    },
    secondary: {
      main: '#FF6F00', // Orange for warmth
      light: '#FFB74D',
      dark: '#E65100',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
      color: '#1B3C53',
    },
    h6: {
      fontWeight: 500,
      color: '#424242',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});



function App() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [showAuth, setShowAuth] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    useEffect(() => {
        // Check if user is already authenticated
        const checkAuth = async () => {
            try {
                await getCurrentUser();
                setIsAuthenticated(true);
            } catch {
                setIsAuthenticated(false);
            }
        };
        checkAuth();
    }, []);
    const user_pool_id = import.meta.env.VITE_USER_POOL_ID;
    const client_id = import.meta.env.VITE_CLIENT_ID;
    console.log('User Pool ID:', user_pool_id);
    console.log('Client ID:', client_id);
    Amplify.configure({
        Auth: {
            Cognito: {
                userPoolId: user_pool_id,
                userPoolClientId: client_id,
                loginWith: {
                    username: true,
                    email: true,
                }
            }
        }
    });
    const formFields = {
        signUp: {
            email: {
                order: 1
            },
            given_name: {
                order: 2,
                label: 'First Name',
            },
            family_name: {
                order: 3,
                label: 'Last Name',
            },
            'custom:user_type': {
                order: 4,
                label: 'Account Type',
                placeholder: 'Select your account type',
                isRequired: true
            },
            password: {
                order: 5
            },
            confirm_password: {
                order: 6
            }
        }
    };


    // Show authenticated app if user is logged in
    if (isAuthenticated) {
        return (
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <Router>
                    <Box sx={{ background: 'linear-gradient(135deg, #F9F3EF 0%, #D2C1B6 100%)', minHeight: '100vh' }}>
                        <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            p: 2, 
                            background: 'linear-gradient(135deg, #1B3C53 0%, #456882 100%)',
                            color: 'white'
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                    🐕 Pupper Adoption
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button component={Link} to="/" sx={{ color: 'white' }}>Home</Button>
                                    <Button component={Link} to="/create-dog" sx={{ color: 'white' }}>Add Dog</Button>
                                    <Button component={Link} to="/extract-text" sx={{ color: 'white' }}>Extract Text</Button>
                                    <Button component={Link} to="/match" sx={{ color: 'white' }}>Match</Button>
                                    <Button component={Link} to="/my-dogs" sx={{ color: 'white' }}>My Dogs</Button>
                                </Box>
                            </Box>
                            <Button 
                                onClick={async () => {
                                    try {
                                        const { signOut } = await import('aws-amplify/auth');
                                        await signOut();
                                        setIsAuthenticated(false);
                                        setShowAuth(false);
                                    } catch (error) {
                                        console.error('Error signing out:', error);
                                    }
                                }} 
                                variant="contained" 
                                sx={{ 
                                    background: '#F9F3EF',
                                    color: '#1B3C53',
                                    fontWeight: 600,
                                    '&:hover': { background: '#D2C1B6' }
                                }}
                            >
                                😪 Logout
                            </Button>
                        </Box>
                        <Box sx={{ p: 2 }}>
                            <Routes>
                                <Route path="/" element={<Home />} />
                                <Route path="/dogs/:id" element={<DogDetail />} />
                                <Route path="/create-dog" element={<CreateDogRouter />} />
                                <Route path="/extract-text" element={<ExtractText />} />
                                <Route path="/match" element={<DogMatcher />} />
                                <Route path="/my-dogs" element={<MyDogs />} />
                            </Routes>
                        </Box>
                    </Box>
                </Router>
            </ThemeProvider>
        );
    }

    // Show authentication screen if user clicked login
    if (showAuth) {
        return (
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <Box sx={{ width: '100vw', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #F9F3EF 0%, #D2C1B6 100%)', px: 2 }}>
                    <Authenticator
                        formFields={formFields}
                        components={{
                            Header() {
                                return (
                                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1B3C53' }}>
                                            🐕 Pupper Adoption
                                        </Typography>
                                        <Button 
                                            onClick={() => setShowAuth(false)}
                                            sx={{ mt: 1, color: '#456882' }}
                                        >
                                            ← Back to Browse
                                        </Button>
                                    </Box>
                                );
                            }
                        }}
                    >
                        {({ user }) => {
                            console.log('Authenticator render - user:', user);
                            
                            // If user successfully logged in, update state and redirect
                            if (user) {
                                console.log('User found, updating state');
                                // Use setTimeout to avoid state update during render
                                setTimeout(() => {
                                    setIsAuthenticated(true);
                                    setShowAuth(false);
                                }, 0);
                                return <div>Login successful! Redirecting...</div>;
                            }
                            
                            console.log('No user found, should show login forms');
                            // This should never be reached as Authenticator handles the forms
                            return <div>Authentication forms should appear here...</div>;
                        }}
                    </Authenticator>
                </Box>
            </ThemeProvider>
        );
    }

    // Show public app by default
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <Box sx={{ width: '100vw', background: '#f5f5f5', minHeight: '100vh' }}>
                    {/* Header with Login Button */}
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        p: 2, 
                        background: 'linear-gradient(135deg, #1B3C53 0%, #456882 100%)',
                        color: 'white'
                    }}>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                            🐕 Pupper Adoption
                        </Typography>
                        <Button 
                            onClick={() => setShowAuth(true)} 
                            variant="contained" 
                            sx={{ 
                                background: '#F9F3EF',
                                color: '#1B3C53',
                                fontWeight: 600,
                                '&:hover': { background: '#D2C1B6' }
                            }}
                        >
                            🔐 Sign In / Sign Up
                        </Button>
                    </Box>
                    <Box sx={{ p: 2 }}>
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/dogs/:id" element={<DogDetail />} />
                        </Routes>
                    </Box>
                </Box>
            </Router>
        </ThemeProvider>
    );

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ minHeight: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #F9F3EF 0%, #D2C1B6 100%)' }}>
                <Authenticator
                    formFields={formFields}
                    components={{
                        Header() {
                            return (
                                <Box sx={{ textAlign: 'center', mb: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 48,
                                            height: 48,
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)',
                                            boxShadow: '0 2px 8px rgba(46,125,50,0.15)',
                                            mr: 1
                                        }}>
                                            <Pets sx={{ fontSize: 28, color: 'white' }} />
                                        </Box>
                                        <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', letterSpacing: '0.5px' }}>
                                            Pupper Adoption
                                        </Typography>
                                    </Box>
                                    <Typography variant="subtitle1" sx={{ color: 'text.secondary', fontWeight: 400 }}>
                                        Sign in to continue
                                    </Typography>
                                </Box>
                            );
                        }
                    }}
                    className="amplify-auth-card"
                >
                {({ signOut, user }) => {
                    if (!user) {
                        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}><span>Loading user session...</span></Box>;
                    }
                    
                    // Determine user role based on custom:user_type attribute
                    const [userType, setUserType] = useState<string | null>(null);
                    
                    useEffect(() => {
                        const checkUserType = async () => {
                            try {
                                const { fetchUserAttributes } = await import('aws-amplify/auth');
                                const attributes = await fetchUserAttributes();
                                setUserType(attributes['custom:user_type'] || 'regular');
                            } catch (error) {
                                setUserType('regular');
                            }
                        };
                        checkUserType();
                    }, [user]);
                    
                    const isShelterUser = userType === 'shelter';
                    
                    // Navigation items based on user type
                    const getNavItems = () => {
                        const baseItems = [
                            { text: '🏠 Home', icon: <HomeIcon />, path: '/' },
                            { text: '💕 Match Dogs', icon: <Pets />, path: '/match' },
                            { text: '🐕 My Dogs', icon: <Pets />, path: '/my-dogs' }
                        ];
                        
                        if (isShelterUser) {
                            return [
                                ...baseItems,
                                { text: '➕ Add Dog', icon: <AddIcon />, path: '/create-dog' },
                                { text: '📄 Text Extract', icon: <AddIcon />, path: '/extract-text' }
                            ];
                        } else {
                            return [
                                ...baseItems,
                                { text: '➕ Add Dog', icon: <AddIcon />, path: '/create-dog' }
                            ];
                        }
                    };
                    
                    const navItems = getNavItems();
                    
                    return (
                        <>
                            <Router>
                                <Box sx={{
                                    position: 'fixed',
                                    top: 16,
                                    left: 16,
                                    right: 16,
                                    zIndex: 1100,
                                    background: 'rgba(249, 243, 239, 0.95)',
                                    backdropFilter: 'blur(20px)',
                                    borderRadius: 4,
                                    boxShadow: '0 8px 32px rgba(27, 60, 83, 0.15)',
                                    border: '1px solid rgba(27, 60, 83, 0.1)',
                                    transition: 'all 0.3s ease'
                                }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: { xs: 2, md: 4 }, py: 1.5 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Box sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: 44,
                                                height: 44,
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, #1B3C53 0%, #456882 100%)',
                                                mr: { xs: 1, md: 2 },
                                                boxShadow: '0 4px 12px rgba(27, 60, 83, 0.3)'
                                            }}>
                                                <Pets sx={{ fontSize: 24, color: 'white' }} />
                                            </Box>
                                            <Typography variant="h6" sx={{
                                                fontWeight: 700,
                                                color: '#1B3C53',
                                                letterSpacing: '0.5px',
                                                fontSize: { xs: '1.1rem', md: '1.25rem' }
                                            }}>
                                                Pupper Adoption
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            {/* Desktop Navigation */}
                                            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
                                                {navItems.map((item) => (
                                                    <Button
                                                        key={item.text}
                                                        component={Link}
                                                        to={item.path}
                                                        sx={{
                                                            color: '#1B3C53',
                                                            fontWeight: 600,
                                                            px: 2,
                                                            py: 1,
                                                            borderRadius: 3,
                                                            fontSize: '0.9rem',
                                                            background: 'linear-gradient(135deg, rgba(27,60,83,0.05) 0%, rgba(69,104,130,0.05) 100%)',
                                                            border: '1px solid rgba(27,60,83,0.1)',
                                                            '&:hover': {
                                                                background: 'linear-gradient(135deg, rgba(27,60,83,0.1) 0%, rgba(69,104,130,0.1) 100%)',
                                                                transform: 'translateY(-2px)',
                                                                boxShadow: '0 4px 12px rgba(27,60,83,0.15)'
                                                            }
                                                        }}
                                                    >
                                                        {item.text}
                                                    </Button>
                                                ))}
                                                <Button
                                                    onClick={signOut}
                                                    sx={{
                                                        color: '#D2C1B6',
                                                        fontWeight: 600,
                                                        px: 2,
                                                        py: 1,
                                                        borderRadius: 3,
                                                        fontSize: '0.9rem',
                                                        background: 'linear-gradient(135deg, #1B3C53 0%, #456882 100%)',
                                                        '&:hover': {
                                                            background: 'linear-gradient(135deg, #0f2a3a 0%, #3a5670 100%)',
                                                            transform: 'translateY(-2px)',
                                                            boxShadow: '0 4px 12px rgba(27,60,83,0.3)'
                                                        }
                                                    }}
                                                >
                                                    🚪 Logout
                                                </Button>
                                            </Box>
                                            
                                            {/* Mobile Menu Button */}
                                            <IconButton
                                                sx={{ display: { xs: 'flex', md: 'none' }, color: '#1B3C53' }}
                                                onClick={() => setMobileOpen(true)}
                                            >
                                                <MenuIcon />
                                            </IconButton>
                                        </Box>
                                    </Box>
                                </Box>
                                
                                {/* Mobile Drawer */}
                                <Drawer
                                    anchor="right"
                                    open={mobileOpen}
                                    onClose={() => setMobileOpen(false)}
                                    sx={{
                                        '& .MuiDrawer-paper': {
                                            width: 280,
                                            background: 'linear-gradient(135deg, #F9F3EF 0%, #D2C1B6 100%)',
                                            backdropFilter: 'blur(20px)'
                                        }
                                    }}
                                >
                                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="h6" sx={{ color: '#1B3C53', fontWeight: 700 }}>
                                            🐕 Navigation
                                        </Typography>
                                        <IconButton onClick={() => setMobileOpen(false)} sx={{ color: '#1B3C53' }}>
                                            <CloseIcon />
                                        </IconButton>
                                    </Box>
                                    <List>
                                        {navItems.map((item) => (
                                            <ListItem
                                                key={item.text}
                                                component={Link}
                                                to={item.path}
                                                onClick={() => setMobileOpen(false)}
                                                sx={{
                                                    borderRadius: 2,
                                                    mx: 1,
                                                    mb: 1,
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(27,60,83,0.08)'
                                                    }
                                                }}
                                            >
                                                <ListItemIcon sx={{ color: '#1B3C53' }}>
                                                    {item.icon}
                                                </ListItemIcon>
                                                <ListItemText 
                                                    primary={item.text} 
                                                    sx={{ '& .MuiListItemText-primary': { color: '#1B3C53', fontWeight: 600 } }}
                                                />
                                            </ListItem>
                                        ))}
                                        <ListItem
                                            onClick={() => { signOut?.(); setMobileOpen(false); }}
                                            sx={{
                                                borderRadius: 2,
                                                mx: 1,
                                                mt: 2,
                                                background: 'linear-gradient(135deg, #1B3C53 0%, #456882 100%)',
                                                '&:hover': {
                                                    background: 'linear-gradient(135deg, #0f2a3a 0%, #3a5670 100%)'
                                                }
                                            }}
                                        >
                                            <ListItemIcon sx={{ color: '#F9F3EF' }}>
                                                <LogoutIcon />
                                            </ListItemIcon>
                                            <ListItemText 
                                                primary="🚪 Logout" 
                                                sx={{ '& .MuiListItemText-primary': { color: '#F9F3EF', fontWeight: 600 } }}
                                            />
                                        </ListItem>
                                    </List>
                                </Drawer>

                                <Box sx={{
                                    background: 'linear-gradient(135deg, #F9F3EF 0%, #D2C1B6 100%)',
                                    minHeight: '100vh',
                                    pt: 10,
                                    pb: 2,
                                    position: 'relative',
                                    scrollBehavior: 'smooth',
                                    overflowX: 'hidden',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: 'radial-gradient(circle at 20% 80%, rgba(27, 60, 83, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(69, 104, 130, 0.05) 0%, transparent 50%)',
                                        pointerEvents: 'none'
                                    }
                                }}>
                                    <Routes>
                                        <Route path="/" element={<Home />} />
                                        <Route path="/dogs/:id" element={<DogDetail />} />
                                        <Route path="/create-dog" element={<CreateDog />} />
                                        <Route path="/extract-text" element={<ExtractText />} />
                                        <Route path="/match" element={<DogMatcher />} />
                                        <Route path="/my-dogs" element={<MyDogs />} />
                                    </Routes>
                                </Box>
                            </Router>
                        </>
                    );
                }}
            </Authenticator>
        </Box>
    </ThemeProvider>
)
}

export default App
