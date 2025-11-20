import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
    Container, Paper, Typography, TextField, Button, Box,
    Alert, CircularProgress, Grid, Link
} from '@mui/material';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-hot-toast';
import { loginUser, type LoginPayload, type LoginResponse } from '../api/AuthApi';

function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [credentials, setCredentials] = useState({
        username: '',
        password: '',
    });

    const mutation = useMutation<LoginResponse, Error, LoginPayload>({
        mutationFn: loginUser,
        onSuccess: (data) => {
            if (data?.idToken) {
                toast.success('¡Bienvenido!');
                login(data.idToken);
                navigate('/');
            } else {
                console.error('Error: La respuesta del login no contiene un idToken.', data);
                toast.error('Ocurrió un error inesperado durante el inicio de sesión.');
            }
        },
        onError: (error) => {
            const isNetworkError = error.message.includes('Network Error') || error.message.includes('Failed to fetch');

            if (isNetworkError) {
                toast.loading('Sin conexión. Intentando restaurar sesión local...', { id: 'offline-login' });
                const token = localStorage.getItem('authToken');
                if (!token) {
                    toast.error('No hay una sesión previa guardada para usar sin conexión.', { id: 'offline-login' });
                    return;
                }
                try {
                    const decodedToken: { exp: number } = jwtDecode(token);
                    if (decodedToken.exp * 1000 > Date.now()) {
                        toast.success('Sesión local restaurada con éxito.', { id: 'offline-login' });
                        login(token);
                        navigate('/');
                    } else {
                        toast.error('Tu sesión guardada ha expirado. Conéctate para renovarla.', { id: 'offline-login' });
                    }
                } catch{
                    toast.error('Tu sesión guardada es inválida. Conéctate para iniciar una nueva.', { id: 'offline-login' });
                }
            } else {
                toast.error('Usuario o contraseña incorrectos.');
            }
        },
        retry: false
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCredentials({
            ...credentials,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!credentials.username || !credentials.password) {
            toast.error("Por favor, complete ambos campos.");
            return;
        }
        mutation.mutate(credentials);
    };

    return (
        <Container component="main" maxWidth="xs" sx={{ mt: 8 }}>
            <Paper elevation={3} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography component="h1" variant="h5">
                    Iniciar Sesión
                </Typography>
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="username"
                        label="Nombre de Usuario"
                        name="username"
                        autoComplete="username"
                        autoFocus
                        value={credentials.username}
                        onChange={handleChange}
                        disabled={mutation.isPending}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Contraseña"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        value={credentials.password}
                        onChange={handleChange}
                        disabled={mutation.isPending}
                    />
                    {mutation.isError && !mutation.error?.message.includes('Network Error') && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            Usuario o contraseña incorrectos.
                        </Alert>
                    )}
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                        disabled={mutation.isPending}
                    >
                        {mutation.isPending ? <CircularProgress size={24} /> : 'Ingresar'}
                    </Button>
                    <Grid container justifyContent="flex-end">
                        <Grid item>
                            <Link component={RouterLink} to="/register" variant="body2">
                                ¿No tienes una cuenta? Regístrate
                            </Link>
                        </Grid>
                    </Grid>
                </Box>
            </Paper>
        </Container>
    );
}

export default LoginPage;