import React, {useState} from 'react';
import {fetchAuthSession} from 'aws-amplify/auth';
import {Container, Typography, Button, Paper, Box, Dialog, DialogTitle, DialogContent, DialogActions} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CircularProgress from '@mui/material/CircularProgress';

const ExtractText: React.FC = () => {
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [message, setMessage] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [extractedText, setExtractedText] = useState('');
    const [dogData, setDogData] = useState<any>(null);
    const [showCreateDog, setShowCreateDog] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [useAI, setUseAI] = useState(false);
    const [aiDescription, setAIDescription] = useState('');
    const [aiImageBase64, setAIImageBase64] = useState<string | null>(null);
    const [aiGenerating, setAIGenerating] = useState(false);

    const handleAIGenerate = async () => {
        setAIGenerating(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            const response = await fetch(`${apiUrl}/ai/generate_image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: aiDescription })
            });
            const data = await response.json();
            if (data.image_base64) {
                setAIImageBase64(data.image_base64);
            }
        } catch (err) {
            console.error('AI generation failed:', err);
        } finally {
            setAIGenerating(false);
        }
    };

    const handleCreateDog = async () => {
        if (!dogData) return;
        
        setLoading(true);
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();
            if (!token) throw new Error('No valid token found');
            
            const apiUrl = import.meta.env.VITE_API_URL;
            let response;
            
            if (useAI && aiImageBase64) {
                // AI generation uses JSON body
                const payload = {
                    ...dogData,
                    image_base64: aiImageBase64
                };
                
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
                Object.entries(dogData).forEach(([key, value]) => {
                    if (value) form.append(key, String(value));
                });
                
                if (imageFile) {
                    form.append('file', imageFile);
                }
                
                response = await fetch(`${apiUrl}/dogs/create_with_image`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: form
                });
            }
            
            if (response.ok) {
                const result = await response.json();
                setMessage(`Dog created successfully! ID: ${result.dog_id}`);
                setShowCreateDog(false);
                // Reset form
                setDogData(null);
                setImageFile(null);
                setAIImageBase64(null);
                setDocumentFile(null);
            } else {
                const error = await response.json();
                setMessage(error.message || 'Failed to create dog');
            }
            setOpenDialog(true);
            
        } catch (error) {
            setMessage('Error creating dog');
            setOpenDialog(true);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!documentFile) {
            setMessage('Please select a document file.');
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
            form.append('document', documentFile);
                
            const response = await fetch(`${apiUrl}/extract-text`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: form
            });
            
            if (!response.ok) {
                const errorJson = await response.json();
                setMessage(errorJson.message || 'Failed to extract text');
                setOpenDialog(true);
                return;
            }
            
            const data = await response.json();
            setExtractedText(data.extracted_text);
            setDogData(data.dog_data);
            setMessage('Text extracted successfully!');
            setShowCreateDog(true);
            setOpenDialog(true);
            
        } catch (error) {
            console.error('Error extracting text:', error);
            setMessage('Error extracting text');
            setOpenDialog(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ width: '100vw', minHeight: '100vh', px: 2, py: 4 }}>
            <Container maxWidth={false} sx={{ maxWidth: '800px', mx: 'auto', position: 'relative' }}>
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
                    <Typography sx={{mt: 2, fontWeight: 500}}>Extracting text...</Typography>
                </Box>
            )}
            
            <Paper elevation={3} sx={{p: 4, borderRadius: 3, background: 'linear-gradient(135deg, #F9F3EF 0%, #D2C1B6 100%)'}}>
                <Typography variant="h4" gutterBottom align="center" sx={{mb: 3, color: '#1B3C53'}}>
                    📄 Text Extraction Tool
                </Typography>
                
                <Typography variant="body1" sx={{mb: 3, textAlign: 'center', color: '#456882'}}>
                    Upload documents to extract and parse dog information
                </Typography>
                
                <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
                    <DialogTitle sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                        {message.includes('successfully') ? (
                            <CheckCircleIcon sx={{fontSize: 32, color: '#4CAF50'}} />
                        ) : (
                            <ErrorOutlineIcon sx={{fontSize: 32, color: '#FF5722'}} />
                        )}
                        {message.includes('successfully') ? 'Success!' : 'Error'}
                    </DialogTitle>
                    <DialogContent>
                        <Typography sx={{mb: 2}}>{message}</Typography>
                        
                        {dogData && (
                            <Box sx={{mb: 3}}>
                                <Typography variant="h6" sx={{mb: 2}}>Extracted Dog Data:</Typography>
                                <Paper sx={{p: 2, bgcolor: '#f5f5f5'}}>
                                    <pre style={{whiteSpace: 'pre-wrap', fontSize: '0.9rem'}}>
                                        {JSON.stringify(dogData, null, 2)}
                                    </pre>
                                </Paper>
                            </Box>
                        )}
                        
                        {showCreateDog && dogData && (
                            <Box sx={{mb: 3}}>
                                <Typography variant="h6" sx={{mb: 2}}>Create Dog with Extracted Data:</Typography>
                                
                                <Box sx={{display: 'flex', gap: 2, mb: 2}}>
                                    <Button 
                                        variant={!useAI ? 'contained' : 'outlined'}
                                        onClick={() => setUseAI(false)}
                                    >
                                        Upload Photo
                                    </Button>
                                    <Button 
                                        variant={useAI ? 'contained' : 'outlined'}
                                        onClick={() => setUseAI(true)}
                                    >
                                        Generate AI Photo
                                    </Button>
                                </Box>
                                
                                {useAI ? (
                                    <Box sx={{mb: 2}}>
                                        <input 
                                            type="text" 
                                            placeholder="Describe the dog for AI generation"
                                            value={aiDescription}
                                            onChange={e => setAIDescription(e.target.value)}
                                            style={{width: '100%', padding: '8px', marginBottom: '8px'}}
                                        />
                                        <Button 
                                            onClick={handleAIGenerate}
                                            disabled={aiGenerating || !aiDescription}
                                            variant="contained"
                                            size="small"
                                        >
                                            {aiGenerating ? 'Generating...' : 'Generate Image'}
                                        </Button>
                                        {aiImageBase64 && (
                                            <Box sx={{mt: 1}}>
                                                <img src={`data:image/png;base64,${aiImageBase64}`} alt="Generated" style={{maxWidth: 200, maxHeight: 200}} />
                                            </Box>
                                        )}
                                    </Box>
                                ) : (
                                    <Box sx={{mb: 2}}>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={e => setImageFile(e.target.files?.[0] || null)}
                                            style={{marginBottom: '8px'}}
                                        />
                                        {imageFile && <Typography variant="body2">Selected: {imageFile.name}</Typography>}
                                    </Box>
                                )}
                                
                                <Button 
                                    onClick={handleCreateDog}
                                    variant="contained" 
                                    color="primary"
                                    disabled={loading || (!imageFile && !aiImageBase64)}
                                    fullWidth
                                >
                                    Create Dog with Extracted Data
                                </Button>
                            </Box>
                        )}
                        
                        {extractedText && (
                            <Box>
                                <Typography variant="h6" sx={{mb: 2}}>Raw Extracted Text:</Typography>
                                <Paper sx={{p: 2, bgcolor: '#f5f5f5', maxHeight: 300, overflow: 'auto'}}>
                                    <Typography variant="body2" sx={{whiteSpace: 'pre-wrap'}}>
                                        {extractedText}
                                    </Typography>
                                </Paper>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenDialog(false)} variant="contained">Close</Button>
                    </DialogActions>
                </Dialog>
                
                <form onSubmit={handleSubmit}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        
                        <Button variant="contained" component="label" fullWidth sx={{py: 3, fontSize: '1.1rem'}}>
                            📄 Upload Document (PDF/Image/TXT/CSV)
                            <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.txt,.csv" onChange={e => setDocumentFile(e.target.files?.[0] || null)} />
                        </Button>
                        
                        {documentFile && (
                            <Typography variant="body1" sx={{textAlign: 'center', color: '#456882'}}>
                                📄 Selected: {documentFile.name}
                            </Typography>
                        )}
                        
                        <Button type="submit" variant="contained" color="primary" fullWidth sx={{py: 2, fontSize: '1.1rem'}} disabled={loading || !documentFile}>
                            🔍 Extract Text & Parse Data
                        </Button>
                    </Box>
                </form>
            </Paper>
            </Container>
        </Box>
    );
};

export default ExtractText;