import React, { useState } from 'react';
import { Container, Typography, TextField, Button, Paper, Box, Card, CardContent, Chip, CircularProgress } from '@mui/material';
import { fetchAuthSession } from 'aws-amplify/auth';

interface MatchedDog {
    dog_id: string;
    name: string;
    age: number;
    weight: number;
    color: string;
    description: string;
    image_url: string;
    match_score: number;
    match_reasons: string[];
}

const DogMatcher: React.FC = () => {
    const [preferences, setPreferences] = useState({
        age_preference: '',
        size_preference: '',
        activity_level: '',
        living_situation: ''
    });
    
    const [matches, setMatches] = useState<MatchedDog[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPreferences({ ...preferences, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();
            if (!token) throw new Error('No valid token found');
            
            const apiUrl = import.meta.env.VITE_API_URL;
            const response = await fetch(`${apiUrl}/dogs/match`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(preferences)
            });
            
            if (!response.ok) {
                throw new Error('Failed to find matches');
            }
            
            const data = await response.json();
            setMatches(data.matches);
        } catch (err: any) {
            setError(err.message || 'Error finding matches');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ width: '100vw', minHeight: '100vh', px: 2, py: 4 }}>
            <Container maxWidth={false} sx={{ maxWidth: '900px', mx: 'auto' }}>
            <Typography variant="h4" gutterBottom align="center">
                Find Your Perfect Dog Match
            </Typography>
            
            <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
                <form onSubmit={handleSubmit}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                        <TextField
                            fullWidth
                            label="Age Preference"
                            name="age_preference"
                            value={preferences.age_preference}
                            onChange={handleChange}
                            placeholder="e.g., young puppy, adult, senior"
                        />
                        <TextField
                            fullWidth
                            label="Size Preference"
                            name="size_preference"
                            value={preferences.size_preference}
                            onChange={handleChange}
                            placeholder="e.g., small, medium, large"
                        />
                        <TextField
                            fullWidth
                            label="Activity Level"
                            name="activity_level"
                            value={preferences.activity_level}
                            onChange={handleChange}
                            placeholder="e.g., low, moderate, high energy"
                        />
                        <TextField
                            fullWidth
                            label="Living Situation"
                            name="living_situation"
                            value={preferences.living_situation}
                            onChange={handleChange}
                            placeholder="e.g., apartment, house with yard"
                        />
                    </Box>
                    
                    <Button 
                        type="submit" 
                        variant="contained" 
                        color="primary" 
                        size="large"
                        disabled={loading}
                        fullWidth
                    >
                        {loading ? <CircularProgress size={24} /> : 'Find My Match'}
                    </Button>
                </form>
            </Paper>

            {error && (
                <Paper elevation={2} sx={{ p: 3, mb: 4, bgcolor: 'error.light' }}>
                    <Typography color="error">{error}</Typography>
                </Paper>
            )}

            {matches.length > 0 && (
                <Box>
                    <Typography variant="h5" gutterBottom>
                        Your Matches ({matches.length} dogs)
                    </Typography>
                    
                    {matches.map((dog) => (
                        <Card key={dog.dog_id} sx={{ mb: 3 }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                    <Typography variant="h6">{dog.name}</Typography>
                                    <Chip 
                                        label={`${Math.round(dog.match_score * 100)}% Match`} 
                                        color="primary"
                                    />
                                </Box>
                                
                                <Typography variant="body2" sx={{ mb: 2 }}>
                                    Age: {dog.age} years • Weight: {dog.weight} lbs • Color: {dog.color}
                                </Typography>
                                
                                <Typography variant="body2" sx={{ mb: 2 }}>
                                    {dog.description}
                                </Typography>
                                
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    Why this is a great match:
                                </Typography>
                                <ul>
                                    {dog.match_reasons.map((reason, index) => (
                                        <li key={index}>
                                            <Typography variant="body2">{reason}</Typography>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            )}
            </Container>
        </Box>
    );
};

export default DogMatcher;