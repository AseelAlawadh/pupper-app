import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
  Container, Card, CardMedia, CardContent, Typography,
  Button, TextField, Paper, MenuItem, Box, Chip,
  Skeleton, Alert, Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Add as AddIcon,
  Favorite as FavoriteIcon,
  ThumbDown as ThumbDownIcon,
  LocationOn as LocationIcon,
  Cake as CakeIcon,
  Scale as ScaleIcon
} from '@mui/icons-material';
import { useAuthenticator } from '@aws-amplify/ui-react';


interface Dog {
  dog_id: string;
  name: string;
  breed: string;
  birthday: string;
  image_url: string;
  wags: number;
  growls: number;
  age?: number;
  city?: string;
  state?: string;
  weight?: number;
  color?: string;
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
  const { user } = useAuthenticator((context) => [context.user]);

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
        let token: string | undefined = undefined;
        try {
          const session = await fetchAuthSession();
          token = session.tokens?.idToken?.toString();
        } catch (e) {
          // Not signed in, that's fine
        }
        const apiUrl = import.meta.env.VITE_API_URL;
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const response = await fetch(`${apiUrl}/dogs`, { headers });
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
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
          {[...Array(6)].map((_, index) => (
            <Card key={index}>
              <Skeleton variant="rectangular" height={200} />
              <CardContent>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="40%" />
                <Skeleton variant="text" width="80%" />
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ width: '100vw', minHeight: '100vh', background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ width: '100%', maxWidth: 1100, mx: 'auto', px: { xs: 1, sm: 2, md: 0 } }}>
        {/* Hero Section */}
        <Box sx={{
          textAlign: 'center',
          mb: 6,
          p: 4,
          background: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)',
          borderRadius: 4,
          color: 'white',
          boxShadow: '0 8px 32px rgba(46, 125, 50, 0.3)'
        }}>
          <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, mb: 2 }}>
            Find Your Perfect Companion
          </Typography>
          <Typography variant="h6" sx={{ mb: 3, opacity: 0.9 }}>
            Discover amazing Labrador Retrievers waiting for their forever homes
          </Typography>
          {user && (
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/create-dog')}
              startIcon={<AddIcon />}
              sx={{
                backgroundColor: 'white',
                color: '#2E7D32',
                '&:hover': { backgroundColor: '#f5f5f5' },
                px: 4,
                py: 1.5
              }}
            >
              Add New Dog
            </Button>
          )}
        </Box>

        {/* Filter Section */}
        <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 3, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <SearchIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Find Your Perfect Match
            </Typography>
          </Box>
          <form onSubmit={handleFilterSubmit}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              <TextField
                select
                label="State"
                name="state"
                value={filters.state}
                onChange={handleFilterChange}
                fullWidth
                size="small"
              >
                {stateOptions.map((option) => (
                  <MenuItem key={option} value={option}>{option || 'Any State'}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Color"
                name="color"
                value={filters.color}
                onChange={handleFilterChange}
                fullWidth
                size="small"
              >
                {colorOptions.map((option) => (
                  <MenuItem key={option} value={option}>{option || 'Any Color'}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Min Weight"
                name="min_weight"
                value={filters.min_weight}
                onChange={handleFilterChange}
                type="number"
                fullWidth
                size="small"
                InputProps={{ endAdornment: <Typography variant="caption">lbs</Typography> }}
              />
              <TextField
                label="Max Weight"
                name="max_weight"
                value={filters.max_weight}
                onChange={handleFilterChange}
                type="number"
                fullWidth
                size="small"
                InputProps={{ endAdornment: <Typography variant="caption">lbs</Typography> }}
              />
              <TextField
                label="Min Age"
                name="min_age"
                value={filters.min_age}
                onChange={handleFilterChange}
                type="number"
                fullWidth
                size="small"
                InputProps={{ endAdornment: <Typography variant="caption">years</Typography> }}
              />
              <TextField
                label="Max Age"
                name="max_age"
                value={filters.max_age}
                onChange={handleFilterChange}
                type="number"
                fullWidth
                size="small"
                InputProps={{ endAdornment: <Typography variant="caption">years</Typography> }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SearchIcon />}
                sx={{ px: 3 }}
              >
                Search
              </Button>
              <Button
                variant="outlined"
                onClick={handleClearFilters}
                startIcon={<ClearIcon />}
              >
                Clear Filters
              </Button>
            </Box>
          </form>
        </Paper>

        {/* Results Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            Available Dogs ({dogs.length})
          </Typography>
          <Divider sx={{ mb: 3 }} />
        </Box>

        {/* Dog Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
          {dogs.map((dog) => (
            <Card key={dog.dog_id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardMedia
                component="img"
                height="250"
                image={dog.image_url || 'https://via.placeholder.com/300x200?text=No+Image'}
                alt={dog.name}
                sx={{ objectFit: 'cover' }}
              />
              <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {dog.name}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CakeIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {calculateAge(dog.birthday)} years old
                  </Typography>
                </Box>

                {dog.weight && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <ScaleIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {dog.weight} lbs
                    </Typography>
                  </Box>
                )}

                {dog.city && dog.state && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <LocationIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {dog.city}, {dog.state}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  {dog.color && (
                    <Chip
                      label={dog.color}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  )}
                  <Chip
                    label={dog.breed}
                    size="small"
                    variant="outlined"
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <FavoriteIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography variant="body2" color="text.secondary">
                      {dog.wags}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ThumbDownIcon sx={{ fontSize: 16, color: 'error.main' }} />
                    <Typography variant="body2" color="text.secondary">
                      {dog.growls}
                    </Typography>
                  </Box>
                </Box>

                <Button
                  component={Link}
                  to={`/dogs/${dog.dog_id}`}
                  variant="contained"
                  fullWidth
                  sx={{ mt: 'auto' }}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>

        {dogs.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No dogs found matching your criteria
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your filters or check back later for new additions
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Home;