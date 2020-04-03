import React from "react";
import "./App.css";

import "typeface-roboto";
import { createMuiTheme } from "@material-ui/core/styles";
import { ThemeProvider } from "@material-ui/core/styles";

import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import GetAppIcon from "@material-ui/icons/GetApp";
import MinimizeIcon from "@material-ui/icons/Minimize";
import FullscreenExitIcon from "@material-ui/icons/FullscreenExit";
import CloseIcon from "@material-ui/icons/Close";

import Drawer from "@material-ui/core/Drawer";
import CssBaseline from "@material-ui/core/CssBaseline";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import ExtensionIcon from "@material-ui/icons/Extension";

import Slider from "@material-ui/core/Slider";

import {
  Theme,
  createStyles,
  makeStyles,
  withStyles
} from "@material-ui/core/styles";

const leftDrawerWidth = 250;
const rightDrawerWidth = 50;

const darkTheme = createMuiTheme({
  palette: {
    type: "dark",
    primary: { main: "#564b7e" },
    secondary: { main: "#786fb3" }
  }
});

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: "flex"
    },
    menuButton: {
      marginRight: theme.spacing(2)
    },
    appBar: {
      zIndex: theme.zIndex.drawer + 1
    },
    title: {
      flexGrow: 1,
    },
    leftDrawer: {
      width: leftDrawerWidth,
      flexShrink: 0
    },
    leftDrawerPaper: {
      width: leftDrawerWidth
    },
    rightDrawer: {
      width: rightDrawerWidth,
      flexShrink: 0
    },
    rightDrawerPaper: {
      width: rightDrawerWidth,
      alignItems: "center"
    },
    slider: {
      margin: "15px",
      color: "#8d85bf"
    },
    sliderTrack: {
      height: 8,
      borderRadius: 4
    },
    sliderRail: {
      height: 8,
      borderRadius: 4
    },
    content: {
      flexGrow: 1,
      padding: theme.spacing(3)
    },

    // Necessary for content to be below AppBar
    toolbar: theme.mixins.toolbar
  })
);

// Attempt to customize slider
const CustomSlider = withStyles({
  root: {
    color: "#8d85bf",
    margin: 10
  },
  thumb: {
    height: 16,
    width: 16
  },
  track: {
    height: 8,
    borderRadius: 4,
    $vertical: {
      width: 8
    }
  },
  rail: {
    height: 8,
    borderRadius: 4,
    "$vertical $rail": {
      width: 8
    }
  }
})(Slider);

function App() {
  const classes = useStyles();
  const [value, setValue] = React.useState<number>(30);

  const handleChange = (event: any, newValue: number | number[]) => {
    setValue(newValue as number);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <div className={classes.root}>
        <CssBaseline />
        <AppBar position="fixed" className={classes.appBar}>
          <Toolbar>
            <IconButton
              edge="start"
              className={classes.menuButton}
              color="inherit"
              aria-label="menu"
            >
              <GetAppIcon />
            </IconButton>
            <Typography variant="h6" className={classes.title} color="inherit">
              Lithium
            </Typography>
            <IconButton aria-label="minimize" color="inherit">
              <MinimizeIcon />
            </IconButton>
            <IconButton aria-label="exit full screen" color="inherit">
              <FullscreenExitIcon />
            </IconButton>
            <IconButton aria-label="close" edge="end" color="inherit">
              <CloseIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Drawer
          className={classes.leftDrawer}
          variant="permanent"
          classes={{
            paper: classes.leftDrawerPaper
          }}
        >
          <div className={classes.toolbar} />
          <List>
            {["Part 1", "Part 2", "Part 3", "Part 4"].map((text, index) => (
              <ListItem button key={text}>
                <ListItemIcon>
                  <ExtensionIcon />
                </ListItemIcon>
                <ListItemText primary={text} />
              </ListItem>
            ))}
          </List>
        </Drawer>
        <main className={classes.content}>
          <div className={classes.toolbar} />
          <Typography paragraph>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Rhoncus
            dolor purus non enim praesent elementum facilisis leo vel. Risus at
            ultrices mi tempus imperdiet. Semper risus in hendrerit gravida
            rutrum quisque non tellus. Convallis convallis tellus id interdum
            velit laoreet id donec ultrices. Odio morbi quis commodo odio aenean
            sed adipiscing. Amet nisl suscipit adipiscing bibendum est ultricies
            integer quis. Cursus euismod quis viverra nibh cras. Metus vulputate
            eu scelerisque felis imperdiet proin fermentum leo. Mauris commodo
            quis imperdiet massa tincidunt. Cras tincidunt lobortis feugiat
            vivamus at augue. At augue eget arcu dictum varius duis at
            consectetur lorem. Velit sed ullamcorper morbi tincidunt. Lorem
            donec massa sapien faucibus et molestie ac.
          </Typography>
          <Typography paragraph>
            Consequat mauris nunc congue nisi vitae suscipit. Fringilla est
            ullamcorper eget nulla facilisi etiam dignissim diam. Pulvinar
            elementum integer enim neque volutpat ac tincidunt. Ornare
            suspendisse sed nisi lacus sed viverra tellus. Purus sit amet
            volutpat consequat mauris. Elementum eu facilisis sed odio morbi.
            Euismod lacinia at quis risus sed vulputate odio. Morbi tincidunt
            ornare massa eget egestas purus viverra accumsan in. In hendrerit
            gravida rutrum quisque non tellus orci ac. Pellentesque nec nam
            aliquam sem et tortor. Habitant morbi tristique senectus et.
            Adipiscing elit duis tristique sollicitudin nibh sit. Ornare aenean
            euismod elementum nisi quis eleifend. Commodo viverra maecenas
            accumsan lacus vel facilisis. Nulla posuere sollicitudin aliquam
            ultrices sagittis orci a.
          </Typography>
        </main>
        <Drawer
          className={classes.rightDrawer}
          variant="permanent"
          classes={{
            paper: classes.rightDrawerPaper
          }}
          anchor="right"
        >
          <div className={classes.toolbar} />
          <Slider
            className={classes.slider}
            orientation="vertical"
            value={value}
            onChange={handleChange}
            aria-labelledby="continuous-slider"
          />
        </Drawer>
      </div>
    </ThemeProvider>
  );
}

export default App;
