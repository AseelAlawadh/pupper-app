import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Card, CardContent, CardMedia, Tabs, Tab } from '@mui/material';
import { fetchAuthSession } from 'aws-amplify/auth';

interface Dog {
    dog_id: string;
    name: string;
    breed: string;
    age: number;
    image_url: string;
    wags: number;
    growls: number;
}

const MyDogs: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);
    const [waggedDogs, setWaggedDogs] = useState<Dog[]>([]);
    const [growledDogs, setGrowledDogs] = useState<Dog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyDogs();
    }, []);

    const fetchMyDogs = async () => {
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();
            if (!token) {
                console.error('No token found');
                return;
            }

            const apiUrl = import.meta.env.VITE_API_URL;
            console.log('Fetching from:', `${apiUrl}/dogs/wagged`);
            
            const [waggedResponse, growledResponse] = await Promise.all([
                fetch(`${apiUrl}/dogs/wagged`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                fetch(`${apiUrl}/dogs/growled`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            console.log('Wagged response status:', waggedResponse.status);
            console.log('Growled response status:', growledResponse.status);

            if (waggedResponse.ok) {
                const waggedData = await waggedResponse.json();
                console.log('Wagged dogs data:', waggedData);
                setWaggedDogs(waggedData);
            } else {
                console.error('Wagged response error:', await waggedResponse.text());
            }
            if (growledResponse.ok) {
                const growledData = await growledResponse.json();
                console.log('Growled dogs data:', growledData);
                setGrowledDogs(growledData);
            } else {
                console.error('Growled response error:', await growledResponse.text());
            }
        } catch (error) {
            console.error('Error fetching my dogs:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderDogs = (dogs: Dog[]) => (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 4, mt: 3 }}>
            {dogs.map((dog) => (
                <Card 
                    key={dog.dog_id} 
                    sx={{
                        borderRadius: 4,
                        background: 'linear-gradient(135deg, #F9F3EF 0%, rgba(249, 243, 239, 0.8) 100%)',
                        border: '2px solid rgba(27, 60, 83, 0.1)',
                        boxShadow: '0 8px 25px rgba(27, 60, 83, 0.15)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            transform: 'translateY(-8px)',
                            boxShadow: '0 15px 40px rgba(27, 60, 83, 0.25)'
                        }
                    }}
                >
                    <CardMedia
                        component="img"
                        height="220"
                        image={dog.image_url || 'https://via.placeholder.com/300x200?text=No+Image'}
                        alt={dog.name}
                        sx={{ objectFit: 'cover' }}
                    />
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1B3C53', mb: 1, textAlign: 'center' }}>
                            🐶 {dog.name}
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#456882', fontWeight: 600, textAlign: 'center', mb: 2 }}>
                            {dog.breed} • {dog.age} years old
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-around', background: 'rgba(255, 255, 255, 0.7)', borderRadius: 3, p: 2 }}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography sx={{ fontSize: '1.5rem' }}>🐕❤️</Typography>
                                <Typography variant="h6" sx={{ color: '#1B3C53', fontWeight: 700 }}>{dog.wags}</Typography>
                                <Typography variant="caption" sx={{ color: '#456882' }}>wags</Typography>
                            </Box>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography sx={{ fontSize: '1.5rem' }}>😤</Typography>
                                <Typography variant="h6" sx={{ color: '#1B3C53', fontWeight: 700 }}>{dog.growls}</Typography>
                                <Typography variant="caption" sx={{ color: '#456882' }}>growls</Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            ))}
        </Box>
    );

    if (loading) return (
        <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="h5">🐕 Loading your furry friends...</Typography>
        </Container>
    );

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ color: '#1B3C53', fontWeight: 700 }}>
                🐾 My Dogs
            </Typography>
            
            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
                <Tab label={`🐕❤️ Wagged (${waggedDogs.length})`} sx={{ fontWeight: 600 }} />
                <Tab label={`😕 Growled (${growledDogs.length})`} sx={{ fontWeight: 600 }} />
            </Tabs>

            {tabValue === 0 && (
                waggedDogs.length > 0 ? renderDogs(waggedDogs) : (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <Typography variant="h5" sx={{ mb: 2 }}>🐶💔</Typography>
                        <Typography variant="h6" color="text.secondary">
                            No wagged dogs yet!
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Start wagging some adorable pups! 🐾✨
                        </Typography>
                    </Box>
                )
            )}
            {tabValue === 1 && (
                growledDogs.length > 0 ? renderDogs(growledDogs) : (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <Typography variant="h5" sx={{ mb: 2 }}>🐕😅</Typography>
                        <Typography variant="h6" color="text.secondary">
                            No growled dogs yet!
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Hopefully you won't need this section! 😊
                        </Typography>
                    </Box>
                )
            )}
        </Container>
    );
};

export default MyDogs;