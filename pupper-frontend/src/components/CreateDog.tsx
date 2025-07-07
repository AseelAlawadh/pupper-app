import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {fetchAuthSession} from 'aws-amplify/auth';
import {Container, Typography, TextField, Button, Paper} from '@mui/material';

const CreateDog: React.FC = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        breed_id: '',
        shelter_name: '',
        city: '',
        state: '',
        species: '',
        shelter_entry_date: '',
        description: '',
        birthday: '',
        weight: '',
        color: ''
    });

    const [file, setFile] = useState<File | null>(null);
    const [message, setMessage] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({...formData, [e.target.name]: e.target.value});
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!file) {
            setMessage('Please select an image file.');
            return;
        }

        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();
            if (!token) throw new Error('No valid token found');

            const apiUrl = import.meta.env.VITE_API_URL;
            const form = new FormData();

            Object.entries(formData).forEach(([key, value]) => {
                if (value) {
                    if (key === 'breed_id' || key === 'weight') {
                        const intValue = parseInt(value);
                        if (!isNaN(intValue)) {
                            form.append(key, String(intValue));
                        }
                    } else {
                        form.append(key, value);
                    }
                }
            });

            form.append('file', file);

            const response = await fetch(`${apiUrl}/dogs/create_with_image`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: form
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Backend Error response:', errorText);
                throw new Error('Failed to create dog');
            }

            const data = await response.json();
            setMessage(`Dog created successfully with ID ${data.dog_id}`);
            navigate(`/dogs/${data.dog_id}`);
        } catch (error) {
            console.error('Error creating dog:', error);
            setMessage('Error creating dog');
        }
    };

    return (
        <Container maxWidth="sm" sx={{mt: 4}}>
            <Paper elevation={3} sx={{p: 4}}>
                <Typography variant="h4" gutterBottom align="center" sx={{mb: 2}}>
                    Create New Dog
                </Typography>
                {message && (
                    <Typography color="error" align="center" sx={{mb: 2}}>
                        {message}
                    </Typography>
                )}
                <form onSubmit={handleSubmit}>
                    <TextField fullWidth label="Name" name="name" value={formData.name} onChange={handleChange}
                               required/>

                    <TextField fullWidth label="Breed ID" name="breed_id" value={formData.breed_id}
                               onChange={handleChange}/>

                    <TextField fullWidth label="Shelter Name" name="shelter_name" value={formData.shelter_name}
                               onChange={handleChange}/>

                    <TextField fullWidth label="City" name="city" value={formData.city} onChange={handleChange}/>

                    <TextField fullWidth label="State" name="state" value={formData.state} onChange={handleChange}/>

                    <TextField fullWidth label="Species" name="species" value={formData.species}
                               onChange={handleChange}/>

                    <TextField fullWidth type="date" label="Shelter Entry Date" name="shelter_entry_date"
                               value={formData.shelter_entry_date} onChange={handleChange}
                               InputLabelProps={{shrink: true}}/>


                    <TextField fullWidth type="date" label="Birthday" name="birthday" value={formData.birthday}
                               onChange={handleChange} InputLabelProps={{shrink: true}}/>

                    <TextField fullWidth type="number" label="Weight" name="weight" value={formData.weight}
                               onChange={handleChange}/>

                    <TextField fullWidth label="Color" name="color" value={formData.color} onChange={handleChange}/>

                    <TextField fullWidth multiline rows={3} label="Description" name="description"
                               value={formData.description} onChange={handleChange}/>

                    <Button variant="contained" component="label" fullWidth>
                        Upload Image
                        <input type="file" hidden accept="image/*" onChange={handleFileChange} required/>
                    </Button>

                    <Button type="submit" variant="contained" color="primary" fullWidth>
                        Create Dog
                    </Button>

                </form>
            </Paper>
        </Container>
    );
};

export default CreateDog;