import {useEffect, useState} from 'react';
import {Typography, Box, Button, Alert, Container, Paper, Skeleton, Card, CardMedia, Chip} from '@mui/material';
import {Favorite as FavoriteIcon, ThumbDown as ThumbDownIcon, ArrowBack as ArrowBackIcon, LocationOn as LocationIcon, Cake as CakeIcon, Scale as ScaleIcon, Pets as PetsIcon} from '@mui/icons-material';
import {type Dog} from '../types/Dog';
import {useParams, useNavigate} from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useAuthenticator } from '@aws-amplify/ui-react';

function DogDetail() {

    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [dog, setDog] = useState<Dog | null>(null);
    const [loading, setLoading] = useState(true);
    const apiUrl = import.meta.env.VITE_API_URL;
    const [message, setMessage] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loadingAction, setLoadingAction] = useState(false);
    const { user } = useAuthenticator((context) => [context.user]);

    useEffect(() => {
        const fetchDog = async () => {
            try {
                const session = await fetchAuthSession();
                const token = session.tokens?.idToken?.toString();
                if (!token) throw new Error('No valid token found');
                const response = await fetch(`${apiUrl}/dogs/${id}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const data = await response.json();
                console.log("Dog:", data);
                setDog(data);
            } catch (error) {
                console.error('Error fetching dogs:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDog();
    }, [id]);

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
            setDog({ ...dog, wags: data.wags });
            setMessage('You wagged this dog! 🐾');
        } catch (error: any) {
            setErrorMsg(error.message || 'Error wagging');
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
            setDog({ ...dog, growls: data.growls });
            setMessage('You growled at this dog! 😠');
        } catch (error: any) {
            setErrorMsg(error.message || 'Error growling');
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
                            🏷️ {dog.breed} • 🎨 {dog.color}
                        </Typography>
                    </Box>
                </Box>

                {/* Main Image */}
                <Box sx={{ mb: 4, textAlign: 'center' }}>
                    <img
                        src={dog.image_url || dog.original_key || 'https://via.placeholder.com/600x400?text=No+Image'}
                        alt={dog.name}
                        style={{
                            maxWidth: '100%',
                            height: '400px',
                            objectFit: 'cover',
                            borderRadius: '12px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                        }}
                    />
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
                </Box>

                {/* Action Buttons */}
                {user && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mb: 3 }}>
                        <Button
                            variant="contained"
                            onClick={handleWag}
                            disabled={loadingAction}
                            size="large"
                            sx={{ 
                                px: 5, 
                                py: 2, 
                                borderRadius: 4,
                                background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                boxShadow: '0 6px 20px rgba(76, 175, 80, 0.3)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #43A047 0%, #5CB85C 100%)',
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 8px 25px rgba(76, 175, 80, 0.4)'
                                }
                            }}
                        >
                            🐕❤️ Wag ({dog.wags})
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleGrowl}
                            disabled={loadingAction}
                            size="large"
                            sx={{ 
                                px: 5, 
                                py: 2, 
                                borderRadius: 4,
                                background: 'linear-gradient(135deg, #FF5722 0%, #FF7043 100%)',
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                boxShadow: '0 6px 20px rgba(255, 87, 34, 0.3)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #E64A19 0%, #FF5722 100%)',
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 8px 25px rgba(255, 87, 34, 0.4)'
                                }
                            }}
                        >
                            😕 Growl ({dog.growls})
                        </Button>
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
