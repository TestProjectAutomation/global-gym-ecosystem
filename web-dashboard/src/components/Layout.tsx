// web-dashboard/src/components/Layout.tsx

import React, { useState } from 'react';
import {
    AppBar,
    Box,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Typography,
    Menu,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard,
    People,
    EventNote,
    Assessment,
    Settings,
    Language,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const navigate = useNavigate();
    const { t, languages, currentLanguage, setLanguage, direction } = useLanguage();

    const menuItems = [
        { text: t('dashboard'), icon: <Dashboard />, path: '/' },
        { text: t('members'), icon: <People />, path: '/members' },
        { text: t('attendance'), icon: <EventNote />, path: '/attendance' },
        { text: t('reports'), icon: <Assessment />, path: '/reports' },
        { text: t('settings'), icon: <Settings />, path: '/settings' },
    ];

    const handleLanguageChange = async (languageCode: string) => {
        await setLanguage(languageCode);
        setAnchorEl(null);
    };

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar position="fixed">
                <Toolbar>
                    <IconButton
                        color="inherit"
                        edge="start"
                        onClick={() => setDrawerOpen(!drawerOpen)}
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                    
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        {t('app_title')}
                    </Typography>
                    
                    <IconButton
                        color="inherit"
                        onClick={(e) => setAnchorEl(e.currentTarget)}
                    >
                        <Language />
                    </IconButton>
                    
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={() => setAnchorEl(null)}
                    >
                        {languages.map((lang) => (
                            <MenuItem
                                key={lang.code}
                                onClick={() => handleLanguageChange(lang.code)}
                                selected={lang.code === currentLanguage}
                            >
                                {lang.nativeName}
                            </MenuItem>
                        ))}
                    </Menu>
                </Toolbar>
            </AppBar>
            
            <Drawer
                anchor={direction === 'rtl' ? 'right' : 'left'}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
            >
                <Box sx={{ width: 250 }} role="presentation">
                    <List>
                        {menuItems.map((item) => (
                            <ListItem
                                button
                                key={item.text}
                                onClick={() => {
                                    navigate(item.path);
                                    setDrawerOpen(false);
                                }}
                            >
                                <ListItemIcon>{item.icon}</ListItemIcon>
                                <ListItemText primary={item.text} />
                            </ListItem>
                        ))}
                    </List>
                </Box>
            </Drawer>
            
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    mt: 8,
                    direction: direction,
                }}
            >
                {children}
            </Box>
        </Box>
    );
};

export default Layout;