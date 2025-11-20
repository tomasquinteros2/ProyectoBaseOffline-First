import React from 'react';
import { onlineManager } from '@tanstack/react-query';
import { Chip } from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';

const ConnectionStatusIndicator: React.FC = () => {
    const isOnline = onlineManager.isOnline();

    return (
        <Chip
            icon={isOnline ? <WifiIcon /> : <WifiOffIcon />}
            label={isOnline ? 'Online' : 'Offline'}
            color={isOnline ? 'success' : 'error'}
            size="small"
            sx={{ ml: 1 }}
        />
    );
};

export default ConnectionStatusIndicator;
