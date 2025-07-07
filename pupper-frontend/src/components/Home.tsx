import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
  Container, Card, CardMedia, CardContent, Typography,
  Button, TextField, Paper, MenuItem, Box
} from '@mui/material';

import Grid from '@mui/material/Grid';

interface Dog {
  dog_id: string;
  name: string;
  breed: string;
  birthday: string;
  image_url: string;
  wags: number;
  growls: number;
  age?: number;
}

const calculateAge = (birthday: string) => {
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const stateOptions = [
  '', 'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];
const colorOptions = [
  '', 'Black', 'Yellow', 'Chocolate', 'Brown', 'White', 'Golden', 'Red', 'Cream', 'Gray', 'Other'
];

const Home: React.FC = () => {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    state: '',
    min_weight: '',
    max_weight: '',
    min_age: '',
    max_age: '',
    color: ''
  });

  const navigate = useNavigate();

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleFilterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      if (!token) throw new Error('No valid token found');

      const apiUrl = import.meta.env.VITE_API_URL;
      const queryParams = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '') queryParams.append(key, value);
      });

      const response = await fetch(`${apiUrl}/dogs/filter?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to filter dogs');

      const data = await response.json();
      setDogs(data);
    } catch (error) {
      console.error('Error filtering dogs:', error);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      state: '',
      min_weight: '',
      max_weight: '',
      min_age: '',
      max_age: '',
      color: ''
    });
  };

  useEffect(() => {
    const fetchDogs = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        const apiUrl = import.meta.env.VITE_API_URL;

        if (!token) throw new Error('No valid token found');

        const response = await fetch(`${apiUrl}/dogs`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch dogs');

        const data = await response.json();
        setDogs(data);
      } catch (error) {
        console.error('Error fetching dogs:', error);
        setError('Unable to load dogs. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDogs();
  }, []);

  if (loading) {
    return <Container maxWidth="lg" sx={{ mt: 4 }}><Typography>Loading dogs...</Typography></Container>;
  }

  if (error) {
    return <Container maxWidth="lg" sx={{ mt: 4 }}><Typography color="error">{error}</Typography></Container>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
        Available Dogs for Adoption
      </Typography>

      <Grid container justifyContent="center" sx={{ mb: 3 }}>
        <Button variant="contained" color="primary" onClick={() => navigate('/create-dog')}>
          Add New Dog
        </Button>
      </Grid>

      <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 3, background: '#f9f9f9', border: '1px solid #e0e0e0' }}>
        <form onSubmit={handleFilterSubmit}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: '1 1 200px', minWidth: 180 }}>
              <TextField
                select
                label="State"
                name="state"
                value={filters.state}
                onChange={handleFilterChange}
                fullWidth
                variant="outlined"
                size="small"
              >
                {stateOptions.map((option) => (
                  <MenuItem key={option} value={option}>{option || 'Any State'}</MenuItem>
                ))}
              </TextField>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: 180 }}>
              <TextField
                select
                label="Color"
                name="color"
                value={filters.color}
                onChange={handleFilterChange}
                fullWidth
                variant="outlined"
                size="small"
              >
                {colorOptions.map((option) => (
                  <MenuItem key={option} value={option}>{option || 'Any Color'}</MenuItem>
                ))}
              </TextField>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: 180 }}>
              <TextField
                label="Min Weight (lbs)"
                name="min_weight"
                value={filters.min_weight}
                onChange={handleFilterChange}
                type="number"
                fullWidth
                variant="outlined"
                size="small"
                helperText=""
              />
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: 180 }}>
              <TextField
                label="Max Weight (lbs)"
                name="max_weight"
                value={filters.max_weight}
                onChange={handleFilterChange}
                type="number"
                fullWidth
                variant="outlined"
                size="small"
                helperText=""
              />
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: 180 }}>
              <TextField
                label="Min Age (years)"
                name="min_age"
                value={filters.min_age}
                onChange={handleFilterChange}
                type="number"
                fullWidth
                variant="outlined"
                size="small"
                helperText=""
              />
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: 180 }}>
              <TextField
                label="Max Age (years)"
                name="max_age"
                value={filters.max_age}
                onChange={handleFilterChange}
                type="number"
                fullWidth
                variant="outlined"
                size="small"
                helperText=""
              />
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: 180 }}>
              <Button type="submit" variant="contained" color="primary" fullWidth sx={{ height: 40 }}>
                Apply Filters
              </Button>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: 180 }}>
              <Button variant="outlined" color="secondary" fullWidth sx={{ height: 40 }} onClick={handleClearFilters}>
                Clear Filters
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>

      <Grid container spacing={4}>
        {dogs.map(dog => (
            <Card
                elevation={4}
                sx={{
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': { transform: 'scale(1.03)', boxShadow: 6 },
                  p: 1
                }}
            >
              <Link to={`/dogs/${dog.dog_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <CardMedia
                    component="img"
                    height="220"
                    image={dog.image_url}
                    alt={dog.name}
                />
                <CardContent>
                  <Typography variant="h6" component="div" align="center" sx={{ fontWeight: 'bold' }}>
                    {dog.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" align="center">
                    {typeof dog.age === 'number' ? `${dog.age} years old` : (dog.birthday ? `${calculateAge(dog.birthday)} years old` : 'Age unknown')} {dog.breed ? `| ${dog.breed}` : ''}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                    🐾 Wags: {dog.wags} | 😠 Growls: {dog.growls}
                  </Typography>
                </CardContent>
              </Link>
            </Card>
        ))}
      </Grid>
    </Container>
  );
};

export default Home;