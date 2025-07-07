import {useEffect, useState} from 'react';
import {Typography, Box, Grid} from '@mui/material';
import {type Dog} from '../types/Dog';
import {useParams} from 'react-router-dom';

function ProductDetail() {

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
                ${dog.color}
            </Typography>
            <Box sx={{my: 2}}>
                <img
                    src={dog.images[0]}
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
                {dog.images.slice(1).map((image, index) => (
                    <Grid key={index}>
                        <img
                            src={image}
                            alt={`${dog.name} - image ${index + 2}`}
                            style={{width: '100%', height: 'auto'}}
                        />
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default ProductDetail;

// import React, {useEffect, useState} from 'react';
// import {useParams} from 'react-router-dom';
// import {fetchAuthSession} from 'aws-amplify/auth';
// import {Container, Paper, Typography, Card, CardMedia, CardContent, Grid, Button} from '@mui/material';
//
// /**
//  * Dog interface represents the structure of a dog object retrieved from the backend API.
// /**
//  * DogDetail component displays details for a single dog retrieved from the backend API.
//  */
// const DogDetail: React.FC = () => {
//     const {id} = useParams<{ id: string }>();
//     const [dog, setDog] = useState<Dog | null>(null);
//
//     useEffect(() => {
//         /**
//          * fetchDog retrieves the details of a specific dog using its ID.
//          */
//         const fetchDog = async () => {
//             try {
//                 // Get current user's session and JWT token from Cognito using fetchAuthSession
//                 const session = await fetchAuthSession();
//                 const token = session.tokens?.idToken?.toString();
//
//                 if (!token) {
//                     throw new Error('No valid token found');
//                 }
//
//                 // Use environment variable for backend base URL
//                 const apiUrl = import.meta.env.VITE_API_URL;
//
//                 const response = await fetch(`${apiUrl}/dogs/${id}`, {
//                     headers: {
//                         Authorization: `Bearer ${token}`
//                     }
//                 });
//
//                 if (!response.ok) {
//                     throw new Error('Failed to fetch dog details');
//                 }
//
//                 const data = await response.json();
//                 // Adjust this based on backend response shape:
//                 // If your backend returns { "data": {...} } use: setDog(data.data);
//                 // If your backend returns the object directly use: setDog(data);
//                 setDog(data);
//             } catch (error) {
//                 console.error('Error fetching dog details:', error);
//             }
//         };
//
//         fetchDog();
//     }, [id]);
//
//     const handleWag = async () => {
//         if (!dog) return;
//         try {
//             const session = await fetchAuthSession();
//             const token = session.tokens?.idToken?.toString();
//             if (!token) throw new Error('No valid token found');
//
//             const apiUrl = import.meta.env.VITE_API_URL;
//             const response = await fetch(`${apiUrl}/dogs/${id}/wag`, {
//                 method: 'POST',
//                 headers: { Authorization: `Bearer ${token}` }
//             });
//
//             if (!response.ok) throw new Error('Failed to wag');
//
//             const data = await response.json();
//             setDog({...dog, wags: data.wags});
//         } catch (error) {
//             console.error('Error wagging:', error);
//         }
//     };
//
//     const handleGrowl = async () => {
//         if (!dog) return;
//         try {
//             const session = await fetchAuthSession();
//             const token = session.tokens?.idToken?.toString();
//             if (!token) throw new Error('No valid token found');
//
//             const apiUrl = import.meta.env.VITE_API_URL;
//             const response = await fetch(`${apiUrl}/dogs/${id}/growl`, {
//                 method: 'POST',
//                 headers: { Authorization: `Bearer ${token}` }
//             });
//
//             if (!response.ok) throw new Error('Failed to growl');
//
//             const data = await response.json();
//             setDog({...dog, growls: data.growls});
//         } catch (error) {
//             console.error('Error growling:', error);
//         }
//     };
//
//     if (!dog) {
//         return (
//             <Container maxWidth="md" sx={{mt: 4}}>
//                 <Typography>Loading dog details...</Typography>
//             </Container>
//         );
//     }
//
//     const imageSrc = dog.image_url ? dog.image_url : dog.original_key;
//
//     return (
//         <Container maxWidth="md" sx={{mt: 4}}>
//             <Paper elevation={3} sx={{p: 4}}>
//                 <Typography variant="h4" gutterBottom align="center">{dog.name}</Typography>
//                 <Card>
//                     <CardMedia
//                         component="img"
//                         height="300"
//                         image={imageSrc}
//                         alt={dog.name}
//                     />
//                     <CardContent>
//                         <Grid container spacing={2}>
//                             <Grid item xs={12} sm={6}>
//                                 <Typography><strong>Shelter:</strong> {dog.shelter_name}</Typography>
//                                 <Typography><strong>City:</strong> {dog.city}</Typography>
//                                 <Typography><strong>State:</strong> {dog.state}</Typography>
//                                 <Typography><strong>Breed:</strong> {dog.breed}</Typography>
//                                 <Typography><strong>Species:</strong> {dog.species}</Typography>
//                             </Grid>
//                             <Grid item xs={12} sm={6}>
//                                 <Typography><strong>Shelter entry date:</strong> {dog.shelter_entry_date}</Typography>
//                                 <Typography><strong>Birthday:</strong> {dog.birthday}</Typography>
//                                 <Typography><strong>Weight:</strong> {dog.weight} lbs</Typography>
//                                 <Typography><strong>Color:</strong> {dog.color}</Typography>
//                             </Grid>
//                             <Grid item xs={12}>
//                                 <Typography><strong>Description:</strong> {dog.description}</Typography>
//                             </Grid>
//                         </Grid>
//                     </CardContent>
//                 </Card>
//                 <Grid container spacing={2} sx={{mt: 2}} justifyContent="center">
//                     <Grid item>
//                         <Button variant="contained" color="success" onClick={handleWag}>Wag ({dog.wags})</Button>
//                     </Grid>
//                     <Grid item>
//                         <Button variant="contained" color="error" onClick={handleGrowl}>Growl ({dog.growls})</Button>
//                     </Grid>
//                 </Grid>
//             </Paper>
//         </Container>
//     );
// };
//
// export default DogDetail;