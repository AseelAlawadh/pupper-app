import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {fetchAuthSession} from 'aws-amplify/auth';
import {Container, Typography, TextField, Button, Paper, MenuItem, Alert, Box} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

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
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const stateOptions = [
        '', 'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    ];
    const colorOptions = [
        '', 'Black', 'Yellow', 'Chocolate', 'Brown', 'White', 'Golden', 'Red', 'Cream', 'Gray', 'Other'
    ];
    const speciesOptions = [
        '', 'Labrador Retriever'
    ];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({...formData, [e.target.name]: e.target.value});
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setImagePreview(URL.createObjectURL(e.target.files[0]));
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
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Container maxWidth="sm" sx={{mt: 4}}>
                <Paper elevation={3} sx={{p: 4, borderRadius: 3, background: '#f9f9f9', border: '1px solid #e0e0e0'}}>
                    <Typography variant="h4" gutterBottom align="center" sx={{mb: 2}}>
                        Create New Dog
                    </Typography>
                    {message && (
                        <Alert severity={message.startsWith('Dog created') ? 'success' : 'error'} sx={{mb: 2}}>
                            {message}
                        </Alert>
                    )}
                    <form onSubmit={handleSubmit}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Typography variant="h6" sx={{mb: 1}}>Shelter Information</Typography>
                            <TextField fullWidth label="Shelter Name" name="shelter_name" value={formData.shelter_name} onChange={handleChange} required size="small"/>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField fullWidth label="City" name="city" value={formData.city} onChange={handleChange} size="small"/>
                                <TextField select fullWidth label="State" name="state" value={formData.state} onChange={handleChange} size="small">
                                    {stateOptions.map((option) => (
                                        <MenuItem key={option} value={option}>{option || 'Any State'}</MenuItem>
                                    ))}
                                </TextField>
                            </Box>
                            <Typography variant="h6" sx={{mt: 2, mb: 1}}>Dog Information</Typography>
                            <TextField fullWidth label="Name" name="name" value={formData.name} onChange={handleChange} required size="small"/>
                            <TextField select fullWidth label="Species" name="species" value={formData.species} onChange={handleChange} required size="small">
                                {speciesOptions.map((option) => (
                                    <MenuItem key={option} value={option}>{option || 'Any Species'}</MenuItem>
                                ))}
                            </TextField>
                            <TextField fullWidth label="Breed ID" name="breed_id" value={formData.breed_id} onChange={handleChange} size="small"/>
                            <TextField fullWidth label="Description" name="description" value={formData.description} onChange={handleChange} multiline rows={3} size="small"/>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <DatePicker
                                    label="Shelter Entry Date"
                                    value={formData.shelter_entry_date ? new Date(formData.shelter_entry_date) : null}
                                    onChange={(newValue: Date | null) => {
                                        const dateString = newValue ? newValue.toISOString().split('T')[0] : '';
                                        setFormData(prev => ({ ...prev, shelter_entry_date: dateString }));
                                    }}
                                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                                />
                                <DatePicker
                                    label="Birthday"
                                    value={formData.birthday ? new Date(formData.birthday) : null}
                                    onChange={(newValue: Date | null) => {
                                        const dateString = newValue ? newValue.toISOString().split('T')[0] : '';
                                        setFormData(prev => ({ ...prev, birthday: dateString }));
                                    }}
                                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField fullWidth type="number" label="Weight (lbs)" name="weight" value={formData.weight} onChange={handleChange} size="small"/>
                                <TextField select fullWidth label="Color" name="color" value={formData.color} onChange={handleChange} size="small">
                                    {colorOptions.map((option) => (
                                        <MenuItem key={option} value={option}>{option || 'Any Color'}</MenuItem>
                                    ))}
                                </TextField>
                            </Box>
                            <Typography variant="h6" sx={{mt: 2, mb: 1}}>Dog Image</Typography>
                            <Button variant="contained" component="label" fullWidth sx={{mb: 1}}>
                                Upload Image
                                <input type="file" hidden accept="image/*" onChange={handleFileChange} required/>
                            </Button>
                            {imagePreview && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                                    <img src={imagePreview} alt="Preview" style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8, border: '1px solid #ccc' }} />
                                </Box>
                            )}
                            <Button type="submit" variant="contained" color="primary" fullWidth sx={{mt: 2}}>
                                Create Dog
                            </Button>
                        </Box>
                    </form>
                </Paper>
            </Container>
        </LocalizationProvider>
    );
};

export default CreateDog;