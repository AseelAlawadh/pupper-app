import {BrowserRouter as Router, Routes, Route, Link} from 'react-router-dom';
import './App.css'
import {Authenticator} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import {Amplify} from 'aws-amplify';
import {AppBar, Toolbar, Button} from '@mui/material';
import Home from './components/Home';
import DogDetail from "./components/DogDetail";
import CreateDog from './components/CreateDog';

function App() {
    const user_pool_id = import.meta.env.VITE_USER_POOL_ID;
    const client_id = import.meta.env.VITE_CLIENT_ID;
    console.log('User Pool ID:', user_pool_id);
    console.log('Client ID:', client_id);
    Amplify.configure({
        Auth: {
            Cognito: {
                userPoolId: user_pool_id,
                userPoolClientId: client_id,
                loginWith: {
                    username: true,
                    email: true,
                }
            }
        }
    });
    const formFields = {
        signUp: {
            email: {
                order: 1
            },
            given_name: {
                order: 2,
                label: 'First Name',
            },
            family_name: {
                order: 3,
                label: 'Last Name',
            },
            password: {
                order: 4
            },
            confirm_password: {
                order: 5
            }
        }
    };
    return (
        <Authenticator formFields={formFields}>
            {({ signOut, user }) => {
                if (!user) {
                    return <div>Loading user session...</div>;
                }
                return (
                    <>
                        <Router>
                            <AppBar position="fixed">
                                <Toolbar>
                                    <Button color="inherit" component={Link} to="/">Home</Button>
                                    <Button color="inherit" onClick={signOut}>Logout</Button>
                                </Toolbar>
                            </AppBar>
                            <Toolbar/>
                            <Routes>
                                <Route path="/" element={<Home />} />
                                <Route path="/dogs/:id" element={<DogDetail />} />
                                <Route path="/create-dog" element={<CreateDog />} />
                            </Routes>
                        </Router>
                    </>
                );
            }}
        </Authenticator>
    )
}

export default App
