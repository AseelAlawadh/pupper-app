import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {fetchAuthSession} from 'aws-amplify/auth';
import {Container, Typography, TextField, Button, Paper, Box, Dialog, DialogTitle, DialogContent, DialogActions, Switch, FormControlLabel} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CircularProgress from '@mui/material/CircularProgress';

const CreateDogShelter: React.FC = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        shelter_name: '',
        city: '',
        state: '',
        species: '',
        description: '',
        birthday: '',
        shelter_entry_date: '',
        weight: '',
        color: ''
    });

    const [file, setFile] = useState<File | null>(null);
    const [message, setMessage] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [useAIGeneration, setUseAIGeneration] = useState(false);
    const [aiDescription, setAIDescription] = useState('');
    const [aiGenerating, setAIGenerating] = useState(false);
    const [aiImageBase64, setAIImageBase64] = useState<string | null>(null);
    const [aiError, setAIError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({...formData, [e.target.name]: e.target.value});
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
                setAIError(errorJson.explanation || 'Failed to generate image');
                return;
            }
            const data = await response.json();
            if (data.image_base64) {
                setAIImageBase64(data.image_base64);
            } else {
                setAIError('No image generated');
            }
        } catch (err) {
            setAIError('Error generating image');
        } finally {
            setAIGenerating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();
            if (!token) throw new Error('No valid token found');
            
            const apiUrl = import.meta.env.VITE_API_URL;
            let response: Response;
            
            if (useAIGeneration && aiImageBase64) {
                // AI generation uses JSON body
                const payload = { ...formData, image_base64: aiImageBase64 };
                response = await fetch(`${apiUrl}/dogs/create_with_generated_image`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}` 
                    },
                    body: JSON.stringify(payload)
                });
            } else {
                // Regular upload uses FormData
                const form = new FormData();
                Object.entries(formData).forEach(([key, value]) => {
                    if (value) form.append(key, value);
                });
                
                if (file) {
                    form.append('file', file);
                }
                
                response = await fetch(`${apiUrl}/dogs/create_with_image`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: form
                });
            }
            
            if (!response.ok) {
                const errorJson = await response.json();
                setMessage(errorJson.message || 'Failed to create dog');
                setOpenDialog(true);
                return;
            }
            
            const data = await response.json();
            setMessage(`Dog created successfully! ID: ${data.dog_id}`);
            setOpenDialog(true);
            navigate(`/dogs/${data.dog_id}`);
            
        } catch (error) {
            console.error('Error creating dog:', error);
            setMessage('Error creating dog');
            setOpenDialog(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ width: '100vw', minHeight: '100vh', px: 2, py: 4 }}>
            <Container maxWidth={false} sx={{ maxWidth: '600px', mx: 'auto', position: 'relative' }}>
            {loading && (
                <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    bgcolor: 'rgba(255,255,255,0.8)',
                    zIndex: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 3
                }}>
                    <CircularProgress color="primary" size={60} />
                    <Typography sx={{mt: 2, fontWeight: 500}}>Processing unclean data...</Typography>
                </Box>
            )}
            
            <Paper elevation={3} sx={{p: 4, borderRadius: 3, background: 'linear-gradient(135deg, #F9F3EF 0%, #D2C1B6 100%)'}}>
                <Typography variant="h4" gutterBottom align="center" sx={{mb: 3, color: '#1B3C53'}}>
                    Shelter Dog Upload
                </Typography>
                
                <Typography variant="body1" sx={{mb: 3, textAlign: 'center', color: '#456882'}}>
                    Upload messy data, documents, or incomplete information - we'll clean it up!
                </Typography>
                
                <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                    <DialogTitle sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                        {message.includes('successfully') ? (
                            <CheckCircleIcon sx={{fontSize: 32, color: '#4CAF50'}} />
                        ) : (
                            <ErrorOutlineIcon sx={{fontSize: 32, color: '#FF5722'}} />
                        )}
                        {message.includes('successfully') ? 'Success!' : 'Error'}
                    </DialogTitle>
                    <DialogContent>
                        <Typography>{message}</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenDialog(false)} variant="contained">Close</Button>
                    </DialogActions>
                </Dialog>
                
                <form onSubmit={handleSubmit}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        
                        <FormControlLabel
                            control={<Switch checked={useAIGeneration} onChange={e => setUseAIGeneration(e.target.checked)} />}
                            label="Generate image with AI (no photo available)"
                            sx={{mb: 2}}
                        />
                        
                        {useAIGeneration ? (
                            <>
                                <TextField
                                    fullWidth
                                    label="Describe the dog for AI generation"
                                    value={aiDescription}
                                    onChange={e => setAIDescription(e.target.value)}
                                    placeholder="e.g. A happy brown Labrador puppy playing in grass"
                                    size="small"
                                    sx={{mb: 1}}
                                />
                                <Button
                                    variant="contained"
                                    onClick={handleAIGenerate}
                                    disabled={aiGenerating || !aiDescription}
                                    fullWidth
                                    sx={{mb: 2, py: 2}}
                                >
                                    {aiGenerating ? 'Generating...' : 'Generate AI Image'}
                                </Button>
                                {aiError && (
                                    <Typography variant="body2" sx={{mb: 2, color: '#FF5722'}}>
                                        AI Error: {aiError}
                                    </Typography>
                                )}
                                {aiImageBase64 && (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                                        <img src={`data:image/png;base64,${aiImageBase64}`} alt="Generated" style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8 }} />
                                    </Box>
                                )}
                            </>
                        ) : (
                            <Button variant="contained" component="label" fullWidth sx={{mb: 2, py: 2}}>
                                Upload Dog Image
                                <input type="file" hidden accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} required={!useAIGeneration} />
                            </Button>
                        )}
                        
                        {file && (
                            <Typography variant="body2" sx={{mb: 2, color: '#456882'}}>
                                Image: {file.name}
                            </Typography>
                        )}
                        
                        <Typography variant="h6" sx={{mt: 2, mb: 1, color: '#1B3C53'}}>Optional Information</Typography>
                        <Typography variant="caption" sx={{mb: 2, color: '#456882'}}>Fill what you know - leave blank if unsure</Typography>
                        
                        <TextField fullWidth label="Dog Name" name="name" value={formData.name} onChange={handleChange} size="small" placeholder="e.g. Buddy (optional)"/>
                        <TextField fullWidth label="Shelter Name" name="shelter_name" value={formData.shelter_name} onChange={handleChange} size="small" placeholder="e.g. City Animal Shelter"/>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField fullWidth label="City" name="city" value={formData.city} onChange={handleChange} size="small" placeholder="Optional"/>
                            <TextField fullWidth label="State" name="state" value={formData.state} onChange={handleChange} size="small" placeholder="e.g. CA"/>
                        </Box>
                        <TextField fullWidth label="Species" name="species" value={formData.species} onChange={handleChange} size="small" placeholder="e.g. Labrador Retriever"/>
                        <TextField fullWidth label="Description" name="description" value={formData.description} onChange={handleChange} multiline rows={2} size="small" placeholder="Any notes about the dog..."/>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField fullWidth label="Birthday" name="birthday" value={formData.birthday} onChange={handleChange} size="small" placeholder="e.g. 2020-03-15 or March 15, 2020"/>
                            <TextField fullWidth label="Shelter Entry Date" name="shelter_entry_date" value={formData.shelter_entry_date} onChange={handleChange} size="small" placeholder="e.g. 2024-01-10"/>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField fullWidth label="Weight" name="weight" value={formData.weight} onChange={handleChange} size="small" placeholder="e.g. 45 lbs or thirty pounds"/>
                            <TextField fullWidth label="Color" name="color" value={formData.color} onChange={handleChange} size="small" placeholder="e.g. brown, golden"/>
                        </Box>
                        
                        <Button type="submit" variant="contained" color="primary" fullWidth sx={{mt: 3, py: 2, fontSize: '1.1rem'}} disabled={loading}>
                            Create Dog (Clean My Data!)
                        </Button>
                    </Box>
                </form>
            </Paper>
            </Container>
        </Box>
    );
};

export default CreateDogShelter;