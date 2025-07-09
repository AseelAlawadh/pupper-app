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
            if (!token) return;

            const apiUrl = import.meta.env.VITE_API_URL;
            
            const [waggedResponse, growledResponse] = await Promise.all([
                fetch(`${apiUrl}/dogs/wagged`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                fetch(`${apiUrl}/dogs/growled`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            if (waggedResponse.ok) {
                setWaggedDogs(await waggedResponse.json());
            }
            if (growledResponse.ok) {
                setGrowledDogs(await growledResponse.json());
            }
        } catch (error) {
            console.error('Error fetching my dogs:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderDogs = (dogs: Dog[]) => (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3, mt: 3 }}>
            {dogs.map((dog) => (
                <Card key={dog.dog_id}>
                    <CardMedia
                        component="img"
                        height="200"
                        image={dog.image_url || 'https://via.placeholder.com/300x200?text=No+Image'}
                        alt={dog.name}
                    />
                    <CardContent>
                        <Typography variant="h6">{dog.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {dog.breed} • {dog.age} years old
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            👍 {dog.wags} wags • 👎 {dog.growls} growls
                        </Typography>
                    </CardContent>
                </Card>
            ))}
        </Box>
    );

    if (loading) return <Container><Typography>Loading...</Typography></Container>;

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Typography variant="h4" gutterBottom>
                My Dogs
            </Typography>
            
            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                <Tab label={`Wagged (${waggedDogs.length})`} />
                <Tab label={`Growled (${growledDogs.length})`} />
            </Tabs>

            {tabValue === 0 && renderDogs(waggedDogs)}
            {tabValue === 1 && renderDogs(growledDogs)}
        </Container>
    );
};

export default MyDogs;