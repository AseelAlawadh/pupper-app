import React, { useState } from 'react';
import { Container, Typography, Button, Paper, Box, Card, CardContent } from '@mui/material';
import { fetchAuthSession } from 'aws-amplify/auth';

const TextExtraction: React.FC = () => {
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [extractedData, setExtractedData] = useState<any>(null);
    const [extractedText, setExtractedText] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleExtract = async () => {
        if (!documentFile) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();
            if (!token) throw new Error('No valid token found');
            
            const formData = new FormData();
            formData.append('document', documentFile);
            
            const apiUrl = import.meta.env.VITE_API_URL;
            const response = await fetch(`${apiUrl}/extract-text`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Failed to extract text');
            }
            
            const data = await response.json();
            setExtractedData(data.dog_data);
            setExtractedText(data.extracted_text);
        } catch (err: any) {
            setError(err.message || 'Error extracting text');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Typography variant="h4" gutterBottom align="center">
                Document Text Extraction
            </Typography>
            
            <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                    Upload a document to extract dog information:
                </Typography>
                
                <Button variant="contained" component="label" fullWidth sx={{ mb: 2 }}>
                    Upload Document (PDF/Image)
                    <input 
                        type="file" 
                        hidden 
                        accept=".pdf,.jpg,.jpeg,.png" 
                        onChange={e => setDocumentFile(e.target.files?.[0] || null)} 
                    />
                </Button>
                
                {documentFile && (
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Selected: {documentFile.name}
                    </Typography>
                )}
                
                <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleExtract}
                    disabled={!documentFile || loading}
                    fullWidth
                >
                    {loading ? 'Extracting...' : 'Extract Text'}
                </Button>
            </Paper>

            {error && (
                <Paper elevation={2} sx={{ p: 3, mb: 4, bgcolor: 'error.light' }}>
                    <Typography color="error">{error}</Typography>
                </Paper>
            )}

            {extractedText && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Extracted Text:
                        </Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
                            {extractedText}
                        </Typography>
                    </CardContent>
                </Card>
            )}

            {extractedData && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Parsed Dog Information:
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                            {Object.entries(extractedData).map(([key, value]) => (
                                <Box key={key}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                        {key.replace('_', ' ').toUpperCase()}:
                                    </Typography>
                                    <Typography variant="body2">
                                        {value as string || 'N/A'}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </CardContent>
                </Card>
            )}
        </Container>
    );
};

export default TextExtraction;