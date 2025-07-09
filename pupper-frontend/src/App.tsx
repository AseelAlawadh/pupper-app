import {BrowserRouter as Router, Routes, Route, Link} from 'react-router-dom';
import './App.css'
import {Authenticator} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import {Amplify} from 'aws-amplify';
import {AppBar, Toolbar, Button, Box, Typography, ThemeProvider, createTheme, CssBaseline} from '@mui/material';
import {Pets, Home as HomeIcon, Add as AddIcon, Logout as LogoutIcon} from '@mui/icons-material';
import Home from './components/Home';
import DogDetail from "./components/DogDetail";
import CreateDog from './components/CreateDog';
import DogMatcher from './components/DogMatcher';

// Create a custom theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#2E7D32', // Green for nature/dogs
      light: '#4CAF50',
      dark: '#1B5E20',
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
      color: '#2E7D32',
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
            password: {
                order: 4
            },
            confirm_password: {
                order: 5
            }
        }
    };
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ minHeight: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #E8F5E8 0%, #F1F8E9 50%, #F9FBE7 100%)' }}>
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
                    return (
                        <>
                            <Router>
                                <AppBar position="fixed" sx={{
                                    background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 25%, #4CAF50 75%, #66BB6A 100%)',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                    backdropFilter: 'blur(10px)',
                                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 4 }, minHeight: 70 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Box sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: 48,
                                                height: 48,
                                                borderRadius: '50%',
                                                background: 'rgba(255,255,255,0.15)',
                                                mr: 2,
                                                backdropFilter: 'blur(10px)'
                                            }}>
                                                <Pets sx={{ fontSize: 28, color: 'white' }} />
                                            </Box>
                                            <Typography variant="h5" sx={{
                                                fontWeight: 700,
                                                color: 'white',
                                                letterSpacing: '0.5px',
                                                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                            }}>
                                                Pupper Adoption
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Button
                                                color="inherit"
                                                component={Link}
                                                to="/"
                                                startIcon={<HomeIcon />}
                                                sx={{
                                                    color: 'white',
                                                    fontWeight: 500,
                                                    px: 3,
                                                    py: 1.5,
                                                    borderRadius: 2,
                                                    background: 'rgba(255,255,255,0.1)',
                                                    backdropFilter: 'blur(10px)',
                                                    border: '1px solid rgba(255,255,255,0.2)',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(255,255,255,0.2)',
                                                        transform: 'translateY(-2px)',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                                    }
                                                }}
                                            >
                                                Home
                                            </Button>
                                            <Button
                                                color="inherit"
                                                component={Link}
                                                to="/create-dog"
                                                startIcon={<AddIcon />}
                                                sx={{
                                                    color: 'white',
                                                    fontWeight: 500,
                                                    px: 3,
                                                    py: 1.5,
                                                    borderRadius: 2,
                                                    background: 'rgba(255,255,255,0.1)',
                                                    backdropFilter: 'blur(10px)',
                                                    border: '1px solid rgba(255,255,255,0.2)',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(255,255,255,0.2)',
                                                        transform: 'translateY(-2px)',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                                    }
                                                }}
                                            >
                                                Add Dog
                                            </Button>
                                            <Button
                                                color="inherit"
                                                component={Link}
                                                to="/match"
                                                sx={{
                                                    color: 'white',
                                                    fontWeight: 500,
                                                    px: 3,
                                                    py: 1.5,
                                                    borderRadius: 2,
                                                    background: 'rgba(255,255,255,0.1)',
                                                    backdropFilter: 'blur(10px)',
                                                    border: '1px solid rgba(255,255,255,0.2)',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(255,255,255,0.2)',
                                                        transform: 'translateY(-2px)',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                                    }
                                                }}
                                            >
                                                Match Dogs
                                            </Button>
                                            <Button
                                                color="inherit"
                                                onClick={signOut}
                                                startIcon={<LogoutIcon />}
                                                sx={{
                                                    color: 'white',
                                                    fontWeight: 500,
                                                    px: 3,
                                                    py: 1.5,
                                                    borderRadius: 2,
                                                    background: 'rgba(255,255,255,0.1)',
                                                    backdropFilter: 'blur(10px)',
                                                    border: '1px solid rgba(255,255,255,0.2)',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(255,255,255,0.2)',
                                                        transform: 'translateY(-2px)',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                                    }
                                                }}
                                            >
                                                Logout
                                            </Button>
                                        </Box>
                                    </Toolbar>
                                </AppBar>
                                <Toolbar sx={{ minHeight: 70 }}/>
                                <Box sx={{
                                    background: 'linear-gradient(135deg, #E8F5E8 0%, #F1F8E9 50%, #F9FBE7 100%)',
                                    minHeight: '100vh',
                                    py: 4,
                                    position: 'relative',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: 'radial-gradient(circle at 20% 80%, rgba(76, 175, 80, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 111, 0, 0.1) 0%, transparent 50%)',
                                        pointerEvents: 'none'
                                    }
                                }}>
                                    <Routes>
                                        <Route path="/" element={<Home />} />
                                        <Route path="/dogs/:id" element={<DogDetail />} />
                                        <Route path="/create-dog" element={<CreateDog />} />
                                        <Route path="/match" element={<DogMatcher />} />
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
