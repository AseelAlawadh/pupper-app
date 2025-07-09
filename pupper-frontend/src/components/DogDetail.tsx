import {useEffect, useState} from 'react';
import {Typography, Box, Button, Alert, Container, Paper, Skeleton, Card, CardMedia, Chip} from '@mui/material';
import {ArrowBack as ArrowBackIcon, Pets as PetsIcon} from '@mui/icons-material';
import {type Dog} from '../types/Dog';
import {useParams, useNavigate} from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';


function DogDetail() {

    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [dog, setDog] = useState<Dog | null>(null);
    const [loading, setLoading] = useState(true);
    const apiUrl = import.meta.env.VITE_API_URL;
    const [message, setMessage] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loadingAction, setLoadingAction] = useState(false);
    // Check if user is authenticated
    const [user, setUser] = useState<any>(null);
    
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { getCurrentUser } = await import('aws-amplify/auth');
                const currentUser = await getCurrentUser();
                setUser(currentUser);
            } catch {
                setUser(null);
            }
        };
        checkAuth();
    }, []);

    useEffect(() => {
        const fetchDog = async () => {
            try {
                let response;
                
                // Try authenticated endpoint first if user is logged in
                if (user) {
                    try {
                        const session = await fetchAuthSession();
                        const token = session.tokens?.idToken?.toString();
                        if (token) {
                            response = await fetch(`${apiUrl}/dogs/${id}/auth`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                        }
                    } catch (authError) {
                        console.log('Auth failed, using public endpoint');
                    }
                }
                
                // Use public endpoint if auth failed or no user
                if (!response || !response.ok) {
                    response = await fetch(`${apiUrl}/dogs/${id}`);
                }
                
                if (!response.ok) {
                    throw new Error('Dog not found');
                }
                
                const data = await response.json();
                console.log("Dog:", data);
                setDog(data);
            } catch (error) {
                console.error('Error fetching dog:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDog();
    }, [id, user]);

    const handleWag = async () => {
        if (!dog) return;
        setLoadingAction(true);
        setMessage(null);
        setErrorMsg(null);
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();
            if (!token) throw new Error('No valid token found');
            const response = await fetch(`${apiUrl}/dogs/${id}/wag`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to wag');
            }
            const data = await response.json();
            setDog({ ...dog, wags: data.wags, user_wagged: true });
            setMessage('You wagged this dog! 🐾');
        } catch (error: any) {
            setErrorMsg(error.message || 'Error wagging');
        } finally {
            setLoadingAction(false);
        }
    };

    const handleUnwag = async () => {
        if (!dog) return;
        setLoadingAction(true);
        setMessage(null);
        setErrorMsg(null);
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();
            if (!token) throw new Error('No valid token found');
            const response = await fetch(`${apiUrl}/dogs/${id}/wag`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to unwag');
            }
            const data = await response.json();
            setDog({ ...dog, wags: data.wags, user_wagged: false });
            setMessage('You removed your wag! 😔');
        } catch (error: any) {
            setErrorMsg(error.message || 'Error removing wag');
        } finally {
            setLoadingAction(false);
        }
    };

    const handleGrowl = async () => {
        if (!dog) return;
        setLoadingAction(true);
        setMessage(null);
        setErrorMsg(null);
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();
            if (!token) throw new Error('No valid token found');
            const response = await fetch(`${apiUrl}/dogs/${id}/growl`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to growl');
            }
            const data = await response.json();
            setDog({ ...dog, growls: data.growls, user_growled: true });
            setMessage('You growled at this dog! 😠');
        } catch (error: any) {
            setErrorMsg(error.message || 'Error growling');
        } finally {
            setLoadingAction(false);
        }
    };

    const handleUngrowl = async () => {
        if (!dog) return;
        setLoadingAction(true);
        setMessage(null);
        setErrorMsg(null);
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();
            if (!token) throw new Error('No valid token found');
            const response = await fetch(`${apiUrl}/dogs/${id}/growl`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to ungrowl');
            }
            const data = await response.json();
            setDog({ ...dog, growls: data.growls, user_growled: false });
            setMessage('You removed your growl! 😌');
        } catch (error: any) {
            setErrorMsg(error.message || 'Error removing growl');
        } finally {
            setLoadingAction(false);
        }
    };

    const calculateAge = (birthday: string) => {
        const birthDate = new Date(birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                    <Skeleton variant="text" width={200} height={40} />
                </Box>
                <Skeleton variant="rectangular" height={400} sx={{ mb: 3, borderRadius: 2 }} />
                <Skeleton variant="text" width="100%" height={60} sx={{ mb: 2 }} />
                <Skeleton variant="text" width="80%" height={40} sx={{ mb: 2 }} />
                <Skeleton variant="text" width="60%" height={40} />
            </Container>
        );
    }

    if (!dog) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4 }}>
                <Alert 
                    severity="error" 
                    sx={{ 
                        borderRadius: 4,
                        p: 3,
                        background: 'linear-gradient(135deg, #FF5722 0%, #FF7043 100%)',
                        color: 'white',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        textAlign: 'center',
                        '& .MuiAlert-icon': { color: 'white', fontSize: '2rem' }
                    }}
                >
                    🐕🔍 Oops! This furry friend couldn't be found. They might have already found their forever home! 🏠❤️
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            {/* Back Button */}
            <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/')}
                sx={{ mb: 3 }}
            >
                Back to Dogs
            </Button>

            {/* Hero Section */}
            <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 4, background: 'linear-gradient(135deg, #F9F3EF 0%, #D2C1B6 100%)', border: '1px solid rgba(27,60,83,0.1)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <PetsIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                    <Box>
                        <Typography variant="h3" sx={{ fontWeight: 700, color: '#1B3C53', mb: 1 }}>
                            🐶 {dog.name} 💕
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#456882', fontWeight: 500 }}>
                            🏷️ {dog.breed}
                        </Typography>
                    </Box>
                </Box>

                {/* Main Image */}
                <Box sx={{ mb: 4, textAlign: 'center', position: 'relative' }}>
                    <Box sx={{
                        position: 'relative',
                        display: 'inline-block',
                        '&::before': {
                            content: '"💕"',
                            position: 'absolute',
                            top: '-10px',
                            right: '-10px',
                            fontSize: '2rem',
                            animation: 'float 3s ease-in-out infinite',
                            zIndex: 1
                        },
                        '&::after': {
                            content: '"✨"',
                            position: 'absolute',
                            bottom: '-10px',
                            left: '-10px',
                            fontSize: '1.5rem',
                            animation: 'float 3s ease-in-out infinite 1.5s',
                            zIndex: 1
                        },
                        '@keyframes float': {
                            '0%, 100%': { transform: 'translateY(0px)' },
                            '50%': { transform: 'translateY(-10px)' }
                        }
                    }}>
                        <img
                            src={dog.image_url || dog.original_key || 'https://via.placeholder.com/600x400?text=No+Image'}
                            alt={dog.name}
                            style={{
                                maxWidth: '100%',
                                height: '400px',
                                objectFit: 'cover',
                                borderRadius: '20px',
                                boxShadow: '0 12px 40px rgba(255, 105, 180, 0.3)',
                                border: '4px solid rgba(255, 182, 193, 0.5)',
                                transition: 'all 0.3s ease'
                            }}
                        />
                    </Box>
                </Box>

                {/* Dog Stats */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3, mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', p: 3, bgcolor: 'rgba(255,255,255,0.9)', borderRadius: 3, boxShadow: '0 4px 12px rgba(27,60,83,0.1)', border: '1px solid rgba(27,60,83,0.05)' }}>
                        <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: '#1B3C53', mr: 2 }}>
                            <Typography sx={{ fontSize: '1.5rem' }}>🎂</Typography>
                        </Box>
                        <Box>
                            <Typography variant="body2" sx={{ color: '#456882', fontWeight: 600 }}>Age</Typography>
                            <Typography variant="h6" sx={{ color: '#1B3C53', fontWeight: 700 }}>{calculateAge(dog.birthday)} years old</Typography>
                        </Box>
                    </Box>
                    {dog.weight && (
                        <Box sx={{ display: 'flex', alignItems: 'center', p: 3, bgcolor: 'rgba(255,255,255,0.9)', borderRadius: 3, boxShadow: '0 4px 12px rgba(27,60,83,0.1)', border: '1px solid rgba(27,60,83,0.05)' }}>
                            <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: '#456882', mr: 2 }}>
                                <Typography sx={{ fontSize: '1.5rem' }}>⚖️</Typography>
                            </Box>
                            <Box>
                                <Typography variant="body2" sx={{ color: '#456882', fontWeight: 600 }}>Weight</Typography>
                                <Typography variant="h6" sx={{ color: '#1B3C53', fontWeight: 700 }}>{dog.weight} lbs</Typography>
                            </Box>
                        </Box>
                    )}
                    {dog.city && dog.state && (
                        <Box sx={{ display: 'flex', alignItems: 'center', p: 3, bgcolor: 'rgba(255,255,255,0.9)', borderRadius: 3, boxShadow: '0 4px 12px rgba(27,60,83,0.1)', border: '1px solid rgba(27,60,83,0.05)' }}>
                            <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: '#D2C1B6', mr: 2 }}>
                                <Typography sx={{ fontSize: '1.5rem' }}>📍</Typography>
                            </Box>
                            <Box>
                                <Typography variant="body2" sx={{ color: '#456882', fontWeight: 600 }}>Location</Typography>
                                <Typography variant="h6" sx={{ color: '#1B3C53', fontWeight: 700 }}>{dog.city}, {dog.state}</Typography>
                            </Box>
                        </Box>
                    )}
                    {dog.color && (
                        <Box sx={{ display: 'flex', alignItems: 'center', p: 3, bgcolor: 'rgba(255,255,255,0.9)', borderRadius: 3, boxShadow: '0 4px 12px rgba(27,60,83,0.1)', border: '1px solid rgba(27,60,83,0.05)' }}>
                            <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: '#F9F3EF', mr: 2 }}>
                                <Typography sx={{ fontSize: '1.5rem' }}>🎨</Typography>
                            </Box>
                            <Box>
                                <Typography variant="body2" sx={{ color: '#456882', fontWeight: 600 }}>Color</Typography>
                                <Typography variant="h6" sx={{ color: '#1B3C53', fontWeight: 700 }}>{dog.color}</Typography>
                            </Box>
                        </Box>
                    )}
                </Box>

                {/* Action Buttons */}
                {user && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mb: 3 }}>
                        {dog.user_wagged ? (
                            <Button
                                variant="outlined"
                                onClick={handleUnwag}
                                disabled={loadingAction}
                                size="large"
                                sx={{ 
                                    px: 6, 
                                    py: 2.5, 
                                    borderRadius: 8,
                                    borderColor: '#1B3C53',
                                    color: '#1B3C53',
                                    fontSize: '1.2rem',
                                    fontWeight: 800,
                                    background: 'rgba(27, 60, 83, 0.05)',
                                    border: '2px dashed #1B3C53',
                                    animation: 'heartbeat 2s infinite',
                                    '@keyframes heartbeat': {
                                        '0%': { transform: 'scale(1)' },
                                        '50%': { transform: 'scale(1.05)' },
                                        '100%': { transform: 'scale(1)' }
                                    },
                                    '&:hover': {
                                        borderColor: '#456882',
                                        backgroundColor: 'rgba(69, 104, 130, 0.1)',
                                        transform: 'translateY(-3px) scale(1.02)',
                                        boxShadow: '0 8px 25px rgba(27, 60, 83, 0.4)'
                                    }
                                }}
                            >
                                💔 Unwag Tail ({dog.wags})
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                onClick={handleWag}
                                disabled={loadingAction || dog.user_growled}
                                size="large"
                                sx={{ 
                                    px: 6, 
                                    py: 2.5, 
                                    borderRadius: 8,
                                    background: 'linear-gradient(135deg, #1B3C53 0%, #456882 50%, #D2C1B6 100%)',
                                    fontSize: '1.2rem',
                                    fontWeight: 800,
                                    boxShadow: '0 8px 25px rgba(27, 60, 83, 0.4)',
                                    animation: 'wiggle 3s infinite',
                                    '@keyframes wiggle': {
                                        '0%, 100%': { transform: 'rotate(0deg)' },
                                        '25%': { transform: 'rotate(2deg)' },
                                        '75%': { transform: 'rotate(-2deg)' }
                                    },
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #0f2a3a 0%, #1B3C53 50%, #456882 100%)',
                                        transform: 'translateY(-4px) scale(1.05)',
                                        boxShadow: '0 12px 35px rgba(27, 60, 83, 0.6)',
                                        animation: 'bounce 0.6s infinite'
                                    }
                                }}
                            >
                                🐕💖 Wag Tail! ({dog.wags})
                            </Button>
                        )}
                        
                        {dog.user_growled ? (
                            <Button
                                variant="outlined"
                                onClick={handleUngrowl}
                                disabled={loadingAction}
                                size="large"
                                sx={{ 
                                    px: 6, 
                                    py: 2.5, 
                                    borderRadius: 8,
                                    borderColor: '#D2C1B6',
                                    color: '#1B3C53',
                                    fontSize: '1.2rem',
                                    fontWeight: 800,
                                    background: 'rgba(210, 193, 182, 0.1)',
                                    border: '2px dashed #D2C1B6',
                                    '&:hover': {
                                        borderColor: '#456882',
                                        backgroundColor: 'rgba(69, 104, 130, 0.1)',
                                        transform: 'translateY(-3px) scale(1.02)',
                                        boxShadow: '0 8px 25px rgba(210, 193, 182, 0.4)'
                                    }
                                }}
                            >
                                🙇 Un-grumpy ({dog.growls})
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                onClick={handleGrowl}
                                disabled={loadingAction || dog.user_wagged}
                                size="large"
                                sx={{ 
                                    px: 6, 
                                    py: 2.5, 
                                    borderRadius: 8,
                                    background: 'linear-gradient(135deg, #D2C1B6 0%, #F9F3EF 50%, #456882 100%)',
                                    fontSize: '1.2rem',
                                    fontWeight: 800,
                                    color: '#1B3C53',
                                    boxShadow: '0 8px 25px rgba(210, 193, 182, 0.4)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #456882 0%, #D2C1B6 50%, #F9F3EF 100%)',
                                        transform: 'translateY(-4px) scale(1.05)',
                                        boxShadow: '0 12px 35px rgba(210, 193, 182, 0.6)'
                                    }
                                }}
                            >
                                😤💕 Not My Type ({dog.growls})
                            </Button>
                        )}
                    </Box>
                )}

                {message && (
                    <Alert 
                        severity="success" 
                        sx={{ 
                            mb: 2, 
                            borderRadius: 3,
                            background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
                            color: 'white',
                            fontWeight: 600,
                            '& .MuiAlert-icon': { color: 'white' }
                        }}
                    >
                        🎉 {message}
                    </Alert>
                )}
                {errorMsg && (
                    <Alert 
                        severity="error" 
                        sx={{ 
                            mb: 2, 
                            borderRadius: 3,
                            background: 'linear-gradient(135deg, #FF5722 0%, #FF7043 100%)',
                            color: 'white',
                            fontWeight: 600,
                            '& .MuiAlert-icon': { color: 'white' }
                        }}
                    >
                        😞 {errorMsg}
                    </Alert>
                )}
            </Paper>

            {/* Description */}
            {dog.description && (
                <Paper elevation={2} sx={{ p: 4, mb: 4, borderRadius: 4, background: 'rgba(249, 243, 239, 0.7)', border: '1px solid rgba(27,60,83,0.1)' }}>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                        About {dog.name}
                    </Typography>
                    <Typography variant="body1" sx={{ lineHeight: 1.8, fontSize: '1.1rem' }}>
                        {dog.description}
                    </Typography>
                    
                    {dog.sentiment_tags && dog.sentiment_tags.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                                Personality Tags:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {dog.sentiment_tags.map((tag, index) => (
                                    <Chip
                                        key={index}
                                        label={`✨ ${tag}`}
                                        size="medium"
                                        sx={{
                                            background: `linear-gradient(135deg, ${index % 2 === 0 ? '#1B3C53' : '#456882'} 0%, ${index % 2 === 0 ? '#456882' : '#D2C1B6'} 100%)`,
                                            color: 'white',
                                            fontWeight: 600,
                                            boxShadow: '0 2px 8px rgba(27,60,83,0.2)',
                                            '&:hover': {
                                                transform: 'translateY(-1px)',
                                                boxShadow: '0 4px 12px rgba(27,60,83,0.3)'
                                            }
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    )}
                </Paper>
            )}

            {/* Additional Images */}
            {[dog.resized_400_key, dog.thumbnail_50_key].some(img => img) && (
                <Paper elevation={2} sx={{ p: 4, borderRadius: 3 }}>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                        More Photos
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3 }}>
                        {[dog.resized_400_key, dog.thumbnail_50_key].map((img, idx) =>
                            img ? (
                                <Card key={idx} elevation={2}>
                                    <CardMedia
                                        component="img"
                                        height="200"
                                        image={img}
                                        alt={`${dog.name} - image ${idx + 2}`}
                                        sx={{ objectFit: 'cover' }}
                                    />
                                </Card>
                            ) : null
                        )}
                    </Box>
                </Paper>
            )}
        </Container>
    );
};

export default DogDetail;
