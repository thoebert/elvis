import React from 'react';
import MainComponent from "./MainComponent";

import { createMuiTheme, MuiThemeProvider } from '@material-ui/core/styles';

function App() {

    const theme = createMuiTheme({
        typography: {
            useNextVariants: true,
        },
        palette: {
            type: 'dark',
        }
    });

    return (
        <MuiThemeProvider theme={theme}>
            <MainComponent/>
        </MuiThemeProvider>);
}

export default App;
