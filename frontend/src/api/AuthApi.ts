// src/api/AuthApi.ts
import apiClient from './apiClient';

export interface LoginPayload {
    username: string;
    password: string;
}

export interface LoginResponse {
    idToken: string;
}

export interface RegisterPayload {
    username: string;
    password: string;
    authorities: string[];
    inviteCode?: string;
}

export interface RegisterInitResponse {
    qrCodeUrl: string;
    secret: string;
}

export interface RegisterVerifyPayload {
    username: string;
    code: string;
}

export interface InviteRequestPayload {
    requestedUsername: string;
    requestedRole: 'USER' | 'ADMIN' | 'VIEWER';
}

export interface InviteCodeResponse {
    inviteCode: string;
    expiresAt: string;
}

export const loginUser = async (credentials: LoginPayload): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return data;
};

export const requestInviteCode = async (payload: InviteRequestPayload): Promise<InviteCodeResponse> => {
    console.log('Requesting invite code with payload):', payload);
    const { data } = await apiClient.post<InviteCodeResponse>('/auth/invite/request', payload);
    return data;
};

export const registerUserInit = async (userData: RegisterPayload): Promise<RegisterInitResponse> => {
    const { data } = await apiClient.post<RegisterInitResponse>('/auth/register/init', userData);
    return data;
};
export const validateInviteCode = async (code: string): Promise<boolean> => {
    const { data } = await apiClient.post<{ valid: boolean }>('/auth/invite/validate', null, {
        params: { code }
    });
    return data.valid;
};

export const registerUserVerify = async (payload: RegisterVerifyPayload): Promise<void> => {
    const params = new URLSearchParams({
        username: payload.username,
        code: payload.code
    });
    await apiClient.post(`/auth/register/verify?${params.toString()}`);
};
