import {useEffect, useState} from 'react';
import {Typography, Box, Grid} from '@mui/material';
import {type Dog} from '../types/Dog';
import {useParams} from 'react-router-dom';

function DogDetail() {

    const {id} = useParams<{ id: string }>();
    const [dog, setDog] = useState<Dog | null>(null);
    const apiUrl = import.meta.env.VITE_API_URL;


    useEffect(() => {
        const fetchDog = async () => {
            try {
                const token = localStorage.getItem('token');
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
            <Typography variant="h5" sx={{mt: 4}}>
                Additional Images
            </Typography>
            <Grid container spacing={2}>
                {[dog.resized_400_key, dog.thumbnail_50_key].map((img, idx) =>
                    img ? (
                        <Grid item key={idx}>
                            <img
                                src={img}
                                alt={`${dog.name} - image ${idx + 2}`}
                                style={{width: '100%', height: 'auto'}}
                            />
                        </Grid>
                    ) : null
                )}
            </Grid>
        </Box>
    );
};

export default DogDetail;
