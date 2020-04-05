import React, { useEffect } from "react";
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

import ThreeScene from "./three";

import {
  Theme,
  createStyles,
  makeStyles,
  withStyles
} from "@material-ui/core/styles";
import { Object3D } from "three";

// import {IpcRenderer} from 'electron';

// declare global {
//   interface Window {
//     require: (module: 'electron') => {
//       ipcRenderer: IpcRenderer
//     };
//   }
// }

const { ipcRenderer } = eval("require('electron')");
// window.require('electron');

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
      height: "100%",
      display: "flex"
    },
    menuButton: {
      marginRight: theme.spacing(2)
    },
    appBar: {
      zIndex: theme.zIndex.drawer + 1
    },
    title: {
      flexGrow: 1
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
      width: "100%",
      height: "100%"
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

class Item {
  name: string = "Item";
  object: Object3D = new Object3D();
}

var itemList:Item[]=[];

function App() {
  const classes = useStyles();
  const [value, setValue] = React.useState<number>(30);

  const handleChange = (event: any, newValue: number | number[]) => {
    setValue(newValue as number);
  };

  useEffect(() => {
    //File selected
    ipcRenderer.on("item:add", function (
      e: any,
      objectName: string,
      object: Object3D
    ) {
      addItem(objectName, object);
    });
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <div className={classes.root}>
        <CssBaseline />
        <AppBar position="fixed" className={classes.appBar}>
          <Toolbar>
            <IconButton
              onClick={loadFile}
              edge="start"
              className={classes.menuButton}
              color="inherit"
              aria-label="import"
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
            {itemList.map(item => (
              <ListItem button key={item.name}>
                <ListItemIcon>
                  <ExtensionIcon />
                </ListItemIcon>
                <ListItemText primary={item.name} />
              </ListItem>
            ))}
          </List>
        </Drawer>
        <main className={classes.content}>
          <div className={classes.toolbar} />
          <ThreeScene />
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

function loadFile() {
  ipcRenderer.send("file:open");
}

function addItem(objectName: string, object: THREE.Object3D) {}

export default App;
