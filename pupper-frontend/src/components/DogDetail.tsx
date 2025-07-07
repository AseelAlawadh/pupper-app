import {useEffect, useState} from 'react';
import {Typography, Box, Button, Alert} from '@mui/material';
import {type Dog} from '../types/Dog';
import {useParams} from 'react-router-dom';
import {fetchAuthSession} from 'aws-amplify/auth';

function DogDetail() {

    const {id} = useParams<{ id: string }>();
    const [dog, setDog] = useState<Dog | null>(null);
    const apiUrl = import.meta.env.VITE_API_URL;
    const [message, setMessage] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loadingAction, setLoadingAction] = useState(false);

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
                headers: {Authorization: `Bearer ${token}`}
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to wag');
            }
            const data = await response.json();
            setDog({...dog, wags: data.wags});
            setMessage('You wagged this dog!');
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
                headers: {Authorization: `Bearer ${token}`}
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to growl');
            }
            const data = await response.json();
            setDog({...dog, growls: data.growls});
            setMessage('You growled at this dog!');
        } catch (error: any) {
            setErrorMsg(error.message || 'Error growling');
        } finally {
            setLoadingAction(false);
        }
    };

    if (!dog) {
        return <Typography>Loading...</Typography>;
    }

    return (
        <Box sx={{padding: 2}}>
            <Typography variant="h3">
                {dog.name}
            </Typography>
            <Typography variant="h4" color="primary">
                {dog.color}
            </Typography>
            <Box sx={{my: 2}}>
                <img
                    src={dog.image_url || dog.original_key}
                    alt={dog.name}
                    style={{maxWidth: '100%', height: '400px'}}
                />
            </Box>
            <Typography variant="body1" paragraph>
                {dog.description}
            </Typography>
            <Box sx={{display: 'flex', justifyContent: 'center', gap: 2, my: 2}}>
                <Button variant="contained" color="success" onClick={handleWag} disabled={loadingAction}>
                    🐾 Wag ({dog.wags})
                </Button>
                <Button variant="contained" color="error" onClick={handleGrowl} disabled={loadingAction}>
                    😠 Growl ({dog.growls})
                </Button>
            </Box>
            {message && <Alert severity="success" sx={{mb: 2}}>{message}</Alert>}
            {errorMsg && <Alert severity="error" sx={{mb: 2}}>{errorMsg}</Alert>}
            <Typography variant="h5" sx={{mt: 4}}>
                Additional Images
            </Typography>
            <Box sx={{display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2}}>
                {[dog.resized_400_key, dog.thumbnail_50_key].map((img, idx) =>
                    img ? (
                        <Box key={idx}>
                            <img
                                src={img}
                                alt={`${dog.name} - image ${idx + 2}`}
                                style={{width: '100%', height: 'auto', maxWidth: 150}}
                            />
                        </Box>
                    ) : null
                )}
            </Box>
        </Box>
    );
};

export default DogDetail;
