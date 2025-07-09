import {BrowserRouter as Router, Routes, Route, Link} from 'react-router-dom';
import './App.css'
import {Authenticator} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import {Amplify} from 'aws-amplify';
import {Button, Box, Typography, ThemeProvider, createTheme, CssBaseline} from '@mui/material';
import {Pets, Home as HomeIcon, Add as AddIcon, Logout as LogoutIcon, Menu as MenuIcon, Close as CloseIcon} from '@mui/icons-material';
import {useState} from 'react';
import {Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton} from '@mui/material';
import Home from './components/Home';
import DogDetail from "./components/DogDetail";
import CreateDog from './components/CreateDog';
import DogMatcher from './components/DogMatcher';
import MyDogs from './components/MyDogs';

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
                    
                    const navItems = [
                        { text: '🏠 Home', icon: <HomeIcon />, path: '/' },
                        { text: '➕ Add Dog', icon: <AddIcon />, path: '/create-dog' },
                        { text: '💕 Match Dogs', icon: <Pets />, path: '/match' },
                        { text: '🐕 My Dogs', icon: <Pets />, path: '/my-dogs' }
                    ];
                    
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
