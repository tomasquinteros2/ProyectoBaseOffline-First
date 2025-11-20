import axios from 'axios';

const UNAUTHORIZED_EVENT = 'app:unauthorized';

export const dispatchUnauthorizedEvent = () => {
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
};

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const isAuthError = error.response?.status === 401 || error.response?.status === 403;

        if (isAuthError) {
            dispatchUnauthorizedEvent();
        }
        return Promise.reject(error);
    }
);

export default apiClient;