import React, {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {fetchAuthSession} from 'aws-amplify/auth';
import {Container, Typography, TextField, Button, Paper, MenuItem, Box, Dialog, DialogTitle, DialogContent, DialogActions, Switch, FormControlLabel} from '@mui/material';
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
    const [isShelterUser, setIsShelterUser] = useState(false);
    
    useEffect(() => {
        const checkUserType = async () => {
            try {
                const { fetchUserAttributes } = await import('aws-amplify/auth');
                const attributes = await fetchUserAttributes();
                const userType = attributes['custom:user_type'];
                setIsShelterUser(userType === 'shelter');
            } catch (error) {
                console.log('Could not fetch user attributes:', error);
            }
        };
        checkUserType();
    }, []);
    const [useAIGeneration, setUseAIGeneration] = useState(false);
    const [aiDescription, setAIDescription] = useState('');
    const [aiGenerating, setAIGenerating] = useState(false);
    const [aiImageBase64, setAIImageBase64] = useState<string | null>(null);
    const [aiError, setAIError] = useState<string | null>(null);
    const [useDocumentUpload, setUseDocumentUpload] = useState(false);
    const [documentFile, setDocumentFile] = useState<File | null>(null);

    const [createdDogImageUrl, setCreatedDogImageUrl] = useState<string | null>(null);

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

    const handleAIGenerate = async () => {
        setAIGenerating(true);
        setAIError(null);
        setAIImageBase64(null);
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            const response = await fetch(`${apiUrl}/ai/generate_image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: aiDescription })
            });
            if (!response.ok) {
                const errorJson = await response.json();
                setAIError(errorJson.explanation || errorJson.message || 'Failed to generate image');
                return;
            }
            const data = await response.json();
            if (data.image_base64) {
                setAIImageBase64(data.image_base64);
            } else {
                setAIError(data.explanation || 'No image generated');
            }
        } catch (err) {
            setAIError('Error generating image');
        } finally {
            setAIGenerating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setCreatedDogImageUrl(null);
        if (useAIGeneration) {
            if (!aiImageBase64) {
                setMessage('Please generate an image first.');
                setOpenDialog(true);
                return;
            }
        } else {
            if (!file) {
                setMessage('Please select an image file.');
                setOpenDialog(true);
                return;
            }
        }
        setLoading(true);
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();
            if (!token) throw new Error('No valid token found');
            const apiUrl = import.meta.env.VITE_API_URL;
            let response;
            if (useDocumentUpload) {
                // Document + Image upload
                if (!documentFile || !file) {
                    setMessage('Please select both document and image files.');
                    setOpenDialog(true);
                    return;
                }
                const form = new FormData();
                form.append('document', documentFile);
                form.append('image', file);
                response = await fetch(`${apiUrl}/dogs/create_with_document`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    body: form
                });
            } else if (useAIGeneration && aiImageBase64) {
                // Send as base64
                const payload: any = { ...formData, image_base64: aiImageBase64 };
                // Remove empty breed_id to avoid validation error
                if (!payload.breed_id || payload.breed_id === '') {
                    delete payload['breed_id'];
                }
                response = await fetch(`${apiUrl}/dogs/create_with_generated_image`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
            } else {
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
                if (file) {
                    form.append('file', file);
                }
                response = await fetch(`${apiUrl}/dogs/create_with_image`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    body: form
                });
            }
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

            // Fetch the image URL for the created dog
            const imageResp = await fetch(`${apiUrl}/dogs/${data.dog_id}/image`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (imageResp.ok) {
                const imageData = await imageResp.json();
                setCreatedDogImageUrl(imageData.url);
            }
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
                                <CheckCircleIcon sx={{fontSize: 32, color: '#4CAF50'}} />
                            ) : (
                                <ErrorOutlineIcon sx={{fontSize: 32, color: '#FF5722'}} />
                            )}
                            {message.startsWith('Dog created') ? '🎉 Dog Created Successfully!' : '😞 Oops! Something went wrong'}
                        </DialogTitle>
                        <DialogContent>
                            <Typography sx={{fontWeight: 500, mb: 1, color: message.startsWith('Dog created') ? 'green' : 'red'}}>
                                {message}
                            </Typography>
                            {createdDogImageUrl && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                                    <img src={createdDogImageUrl} alt="Created Dog" style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8, border: '1px solid #ccc' }} />
                                </Box>
                            )}
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
                            <TextField 
                                fullWidth 
                                label="Name" 
                                name="name" 
                                value={formData.name} 
                                onChange={handleChange} 
                                required={!isShelterUser}
                                helperText={isShelterUser ? "Optional for shelter users" : ""}
                                size="small"
                            />
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
                            <FormControlLabel
                                control={<Switch checked={useAIGeneration} onChange={e => setUseAIGeneration(e.target.checked)} />}
                                label="Generate with AI"
                                sx={{mb: 1}}
                            />
                            {isShelterUser && (
                                <FormControlLabel
                                    control={<Switch checked={useDocumentUpload} onChange={e => setUseDocumentUpload(e.target.checked)} />}
                                    label="📄 Upload Document + Image (Shelter Feature)"
                                    sx={{mb: 1}}
                                />
                            )}
                            {useAIGeneration ? (
                                <>
                                    <TextField
                                        fullWidth
                                        label="Image Description"
                                        value={aiDescription}
                                        onChange={e => setAIDescription(e.target.value)}
                                        placeholder="e.g. A happy black Labrador puppy in a park"
                                        size="small"
                                        sx={{mb: 1}}
                                    />
                                    <Button
                                        variant="contained"
                                        onClick={handleAIGenerate}
                                        disabled={aiGenerating || !aiDescription}
                                        sx={{mb: 1}}
                                    >
                                        {aiGenerating ? 'Generating...' : 'Generate Image'}
                                    </Button>
                                    {aiError && (
                                        <Box sx={{ 
                                            p: 2, 
                                            borderRadius: 3, 
                                            background: 'linear-gradient(135deg, #FF5722 0%, #FF7043 100%)', 
                                            color: 'white', 
                                            mb: 1,
                                            textAlign: 'center'
                                        }}>
                                            <Typography sx={{ fontWeight: 600 }}>
                                                🤖❌ AI Generation Failed: {aiError}
                                            </Typography>
                                        </Box>
                                    )}
                                    {aiImageBase64 && (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                                            <img src={`data:image/png;base64,${aiImageBase64}`} alt="Generated Preview" style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8, border: '1px solid #ccc' }} />
                                        </Box>
                                    )}
                                </>
                            ) : useDocumentUpload ? (
                                <>
                                    <Button variant="contained" component="label" fullWidth sx={{mb: 1}}>
                                        Upload Document (PDF/Image)
                                        <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={e => setDocumentFile(e.target.files?.[0] || null)} required/>
                                    </Button>
                                    {documentFile && <Typography variant="body2" sx={{mb: 1}}>Document: {documentFile.name}</Typography>}
                                    <Button variant="contained" component="label" fullWidth sx={{mb: 1}}>
                                        Upload Dog Image
                                        <input type="file" hidden accept="image/*" onChange={handleFileChange} required/>
                                    </Button>
                                </>
                            ) : (
                                <Button variant="contained" component="label" fullWidth sx={{mb: 1}}>
                                    Upload Image
                                    <input type="file" hidden accept="image/*" onChange={handleFileChange} required={!useAIGeneration && !useDocumentUpload}/>
                                </Button>
                            )}
                            {(!useAIGeneration && imagePreview) && (
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