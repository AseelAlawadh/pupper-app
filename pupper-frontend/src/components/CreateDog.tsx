import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {fetchAuthSession} from 'aws-amplify/auth';
import {Container, Typography, TextField, Button, Paper, MenuItem, Box, Dialog, DialogTitle, DialogContent, DialogActions} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Chip, Stack } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';

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
    const [errorDetails, setErrorDetails] = useState<string | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [loading, setLoading] = useState(false);

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
            setOpenDialog(true);
            return;
        }

        setLoading(true);
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
                let errorMsg = 'Failed to create dog';
                let errorDetailsMsg = null;
                try {
                    const errorJson = await response.json();
                    if (errorJson.error === 'Image is not a Labrador Retriever' && errorJson.rekognition_result) {
                        errorMsg = errorJson.message;
                        errorDetailsMsg = `Detected labels: ${errorJson.rekognition_result.explanation}`;
                    } else if (errorJson.message) {
                        errorMsg = errorJson.message;
                    }
                } catch (err) {
                    const errorText = await response.text();
                    errorMsg = errorText;
                }
                setMessage(errorMsg);
                setErrorDetails(errorDetailsMsg);
                setOpenDialog(true);
                return;
            }

            const data = await response.json();
            setMessage(`Dog created successfully with ID ${data.dog_id}`);
            setOpenDialog(true);
            navigate(`/dogs/${data.dog_id}`);
        } catch (error) {
            console.error('Error creating dog:', error);
            setMessage('Error creating dog');
        } finally {
            setLoading(false);
        }
    };

    // Helper to parse detected labels from errorDetails
    const getDetectedLabels = () => {
        if (!errorDetails) return [];
        // errorDetails: 'Detected labels: Dog (99%), Golden Retriever (98%)'
        const match = errorDetails.match(/Detected labels: (.*)/);
        if (!match) return [];
        return match[1].split(',').map(label => label.trim());
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Container maxWidth="sm" sx={{mt: 4, position: 'relative'}}>
                {loading && (
                    <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        bgcolor: 'rgba(255,255,255,0.7)',
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 3
                    }}>
                        <CircularProgress color="primary" size={60} />
                        <Typography sx={{mt: 2, fontWeight: 500}}>Uploading and validating...</Typography>
                    </Box>
                )}
                <Paper elevation={3} sx={{p: 4, borderRadius: 3, background: '#f9f9f9', border: '1px solid #e0e0e0'}}>
                    <Typography variant="h4" gutterBottom align="center" sx={{mb: 2}}>
                        Create New Dog
                    </Typography>
                    <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                        <DialogTitle sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                            {message.startsWith('Dog created') ? (
                                <CheckCircleIcon color="success" sx={{fontSize: 32}} />
                            ) : (
                                <ErrorOutlineIcon color="error" sx={{fontSize: 32}} />
                            )}
                            {message.startsWith('Dog created') ? 'Dog Created!' : 'Oops!'}
                        </DialogTitle>
                        <DialogContent>
                            <Typography sx={{fontWeight: 500, mb: 1, color: message.startsWith('Dog created') ? 'green' : 'red'}}>
                                {message}
                            </Typography>
                            {errorDetails && getDetectedLabels().length > 0 && (
                                <Box sx={{mt: 2}}>
                                    <Typography variant="subtitle2" sx={{mb: 1, color: 'gray'}}>Detected in your image:</Typography>
                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                        {getDetectedLabels().map((label, idx) => (
                                            <Chip key={idx} label={label} color="default" variant="outlined" />
                                        ))}
                                    </Stack>
                                </Box>
                            )}
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setOpenDialog(false)} color="primary" variant="contained">Close</Button>
                        </DialogActions>
                    </Dialog>
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
                            <Button type="submit" variant="contained" color="primary" fullWidth sx={{mt: 2}} disabled={loading}>
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