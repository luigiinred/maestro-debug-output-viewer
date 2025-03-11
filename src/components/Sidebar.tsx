import React from 'react';
import { Box, IconButton, Tooltip, useTheme } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';

// Icons
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';

interface SidebarProps {
    activePage: 'explorer' | 'settings' | 'runflows';
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    const handleNavigation = (path: string) => {
        navigate(path);
    };

    // Define the sidebar items
    const sidebarItems = [
        {
            icon: <FolderOutlinedIcon />,
            tooltip: 'Test Output Explorer',
            path: '/',
            active: activePage === 'explorer'
        },
        {
            icon: <PlayArrowOutlinedIcon />,
            tooltip: 'Run Maestro Commands',
            path: '/runflows',
            active: activePage === 'runflows'
        },
        {
            icon: <SettingsOutlinedIcon />,
            tooltip: 'Settings',
            path: '/settings',
            active: activePage === 'settings'
        }
    ];

    return (
        <Box
            sx={{
                width: '48px',
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                pt: 1,

            }}
        >
            {sidebarItems.map((item, index) => (
                <Tooltip key={index} title={item.tooltip} placement="right">
                    <span>
                        <IconButton
                            onClick={() => handleNavigation(item.path)}
                            sx={{
                                my: 0.5,
                                color: item.active
                                    ? theme.palette.primary.main
                                    : theme.palette.text.secondary,

                                borderLeft: item.active
                                    ? `2px solid ${theme.palette.primary.main}`
                                    : '2px solid transparent',
                                borderRadius: 0,
                                width: '48px',
                                height: '48px',
                                '&:focus': {
                                    outline: 'none',
                                    boxShadow: 'none'
                                },
                                '&.Mui-focusVisible': {
                                    outline: 'none',
                                    boxShadow: 'none'
                                }
                            }}
                        >
                            {item.icon}
                        </IconButton>
                    </span>
                </Tooltip>
            ))}
        </Box>
    );
}; 