import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { AxiosError } from 'axios';
import { toast } from 'react-hot-toast';
import {
    Container, Paper, Typography, TextField, Button, Box,
    Alert, CircularProgress, Link, Grid, Stepper, Step, StepLabel,
    FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
    requestInviteCode,
    type InviteRequestPayload
} from '../api/AuthApi';
import apiClient from '../api/apiClient';

interface ErrorResponse {
    message: string;
}

interface ValidateCodeResponse {
    valid: boolean;
    requestedUsername?: string;
    requestedRole?: string;
}

function RegisterPage() {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
    });
    const [selectedRole, setSelectedRole] = useState<'USER' | 'ADMIN' | 'VIEWER'>('USER');
    const [inviteCode, setInviteCode] = useState('');
    const [needsInvite, setNeedsInvite] = useState(false);
    const [validatedCode, setValidatedCode] = useState('');

    const steps = ['Solicitar invitación', 'Crear contraseña'];

    useEffect(() => {
        setNeedsInvite(selectedRole === 'ADMIN' || selectedRole === 'VIEWER');
        if (selectedRole === 'USER') {
            setInviteCode('');
        }
    }, [selectedRole]);

    const normalizeRole = (role?: string): 'USER' | 'ADMIN' | 'VIEWER' => {
        const clean = role?.replace(/^ROLE_/, '') ?? 'USER';
        return clean === 'ADMIN' || clean === 'VIEWER' ? clean : 'USER';
    };

    const validateCodeMutation = useMutation({
        mutationFn: async (code: string) => {
            const response = await apiClient.post<ValidateCodeResponse>(
                '/auth/invite/validate',
                null,
                { params: { code } }
            );
            return response.data;
        },
        onSuccess: (data) => {
            if (data.valid) {
                const cleanedCode = inviteCode.trim();
                toast.success('Código de invitación válido');
                setValidatedCode(cleanedCode);
                if (data.requestedUsername) {
                    setFormData(prev => ({ ...prev, username: data.requestedUsername }));
                }
                if (data.requestedRole) {
                    setSelectedRole(normalizeRole(data.requestedRole));
                }
                setActiveStep(1);
            } else {
                toast.error('Código de invitación inválido o expirado');
                setInviteCode('');
            }
        },
        onError: () => toast.error('Error al validar el código')
    });

    const inviteMutation = useMutation({
        mutationFn: (payload: InviteRequestPayload) => requestInviteCode(payload),
        onSuccess: () => {
            toast.success('Código generado y enviado por email');
        },
        onError: (error: unknown) => {
            let errorMessage = 'Error al solicitar código de invitación.';
            if (error instanceof AxiosError) {
                const responseData = error.response?.data as ErrorResponse | undefined;
                if (responseData?.message) errorMessage = responseData.message;
            }
            toast.error(errorMessage);
        }
    });

    const registerMutation = useMutation({
        mutationFn: async (payload: { username: string; password: string; role: string; inviteCode: string }) => {
            const { data } = await apiClient.post('/auth/register', payload, {
                params: { inviteCode: payload.inviteCode }
            });
            return data;
        },
        onSuccess: () => {
            toast.success('¡Registro exitoso! Ahora puedes iniciar sesión.');
            navigate('/login');
        },
        onError: (error: unknown) => {
            let errorMessage = 'Error al crear la cuenta.';
            if (error instanceof AxiosError) {
                const responseData = error.response?.data as ErrorResponse | undefined;
                if (responseData?.message) errorMessage = responseData.message;
            }
            toast.error(errorMessage);
        }
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleValidateCode = () => {
        if (inviteCode.trim().length > 0) {
            validateCodeMutation.mutate(inviteCode.trim());
        }
    };

    const handleRequestInvite = () => {
        if (formData.username.trim().length < 6) {
            toast.error('Ingresa un nombre de usuario válido primero.');
            return;
        }
        inviteMutation.mutate({
            requestedUsername: formData.username.trim(),
            requestedRole: selectedRole
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            toast.error('Las contraseñas no coinciden.');
            return;
        }

        const roleToSend = normalizeRole(selectedRole);
        registerMutation.mutate({
            username: formData.username.trim(),
            password: formData.password,
            role: roleToSend,
            inviteCode: validatedCode.trim()
        });
    };

    const isUsernameError = formData.username.length > 0 && formData.username.trim().length < 6;
    const isPasswordError = formData.password.length > 0 && formData.password.length < 6;
    const isConfirmPasswordError = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

    return (
        <Container component="main" maxWidth="sm" sx={{ mt: 8 }}>
            <Paper elevation={3} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
                    Crear Cuenta
                </Typography>

                <Stepper activeStep={activeStep} sx={{ width: '100%', mb: 4 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {activeStep === 0 && (
                    <Box sx={{ width: '100%' }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="username"
                            label="Nombre de Usuario"
                            name="username"
                            autoComplete="username"
                            autoFocus
                            value={formData.username}
                            onChange={handleChange}
                            disabled={inviteMutation.isPending || validateCodeMutation.isPending}
                            error={isUsernameError}
                            helperText={isUsernameError ? "Debe tener al menos 6 caracteres" : ""}
                        />

                        <FormControl fullWidth margin="normal">
                            <InputLabel id="role-label">Tipo de Cuenta</InputLabel>
                            <Select
                                labelId="role-label"
                                value={selectedRole}
                                label="Tipo de Cuenta"
                                onChange={(e) => setSelectedRole(e.target.value as 'USER' | 'ADMIN' | 'VIEWER')}
                                disabled={inviteMutation.isPending || validateCodeMutation.isPending}
                            >
                                <MenuItem value="USER">Usuario (USER)</MenuItem>
                                <MenuItem value="VIEWER">Visualizador (VIEWER)</MenuItem>
                                <MenuItem value="ADMIN">Administrador (ADMIN)</MenuItem>
                            </Select>
                        </FormControl>
                        {selectedRole === 'USER' && (
                            <Button
                                variant="contained"
                                fullWidth
                                sx={{ mt: 3 }}
                                onClick={() => {
                                    setValidatedCode('');
                                    setActiveStep(1);
                                }}
                            >
                                Continuar
                            </Button>
                        )}
                        {needsInvite && (
                            <Box sx={{ mt: 2, mb: 2, p: 2, borderRadius: 1 }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Este rol requiere un código de invitación
                                </Typography>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    onClick={handleRequestInvite}
                                    disabled={inviteMutation.isPending || formData.username.trim().length < 6}
                                    sx={{ mb: 2 }}
                                >
                                    {inviteMutation.isPending ? <CircularProgress size={20} /> : 'Solicitar Código de Invitación'}
                                </Button>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <TextField
                                        fullWidth
                                        label="Código de Invitación"
                                        value={inviteCode}
                                        onChange={(e) => setInviteCode(e.target.value)}
                                        disabled={validateCodeMutation.isPending}
                                        placeholder="Ingresa el código recibido"
                                    />
                                    <Button
                                        variant="contained"
                                        onClick={handleValidateCode}
                                        disabled={validateCodeMutation.isPending || !inviteCode.trim()}
                                        sx={{ minWidth: '100px' }}
                                    >
                                        {validateCodeMutation.isPending ? <CircularProgress size={20} /> : 'Validar'}
                                    </Button>
                                </Box>
                            </Box>
                        )}

                        <Grid container justifyContent="flex-end" sx={{ mt: 2 }}>
                            <Grid item>
                                <Link component={RouterLink} to="/login" variant="body2">
                                    ¿Ya tienes una cuenta? Inicia sesión
                                </Link>
                            </Grid>
                        </Grid>
                    </Box>
                )}

                {activeStep === 1 && (
                    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                        <Typography variant="h6" gutterBottom>
                            Crear contraseña
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Usuario: {formData.username}
                        </Typography>

                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Contraseña"
                            type="password"
                            id="password"
                            autoComplete="new-password"
                            value={formData.password}
                            onChange={handleChange}
                            disabled={registerMutation.isPending}
                            error={isPasswordError}
                            helperText={isPasswordError ? "Debe tener al menos 6 caracteres" : ""}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="confirmPassword"
                            label="Confirmar Contraseña"
                            type="password"
                            id="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            disabled={registerMutation.isPending}
                            error={isConfirmPasswordError}
                            helperText={isConfirmPasswordError ? "Las contraseñas no coinciden" : ""}
                        />
                        {registerMutation.isError && (
                            <Alert severity="error" sx={{ mt: 2 }}>
                                Error al crear la cuenta.
                            </Alert>
                        )}
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                            disabled={registerMutation.isPending}
                        >
                            {registerMutation.isPending ? <CircularProgress size={24} /> : 'Crear Cuenta'}
                        </Button>
                    </Box>
                )}
            </Paper>
        </Container>
    );
}

export default RegisterPage;