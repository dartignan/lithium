Lithium
=======

Lithium is a 3D model viewer based on [electron](https://github.com/electron/electron), [react](https://github.com/facebook/react), [three.js](https://github.com/mrdoob/three.js), [react-three-fiber](https://github.com/react-spring/react-three-fiber) & [material-ui](https://github.com/mui-org/material-ui).

![Lithium screenshot](/screenshot.png)

The name of this project comes from the 3 main packages this project relies on: `electron`, `three.js` and `material-ui`. The `lithium` metal is a three-electron-material (in its neutral form).

## Features

### Supported formats

Lithium currently supports the following file formats:
- [3MF](https://github.com/3MFConsortium/spec_core)
- [STL](https://en.wikipedia.org/wiki/STL_(file_format))

### 3D View

The 3D view supports camera gestures, as well as item selection.

### Clipping

The slider on the right enables to clip the parts with an horizontal plane.

## Development

To clone and run this repository you'll need [Git](https://git-scm.com/), [Node.js](https://nodejs.org) and [yarn](https://yarnpkg.com/) installed on your computer. From your command line:

```bash
# Clone this repository
git clone https://github.com/dartignan/lithium
# Go into the repository
cd lithium
# Install dependencies
yarn install
# Run the app
yarn start
```

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

### Debugging

This project contains the following debug configurations for [VSCode](https://code.visualstudio.com/):

Configuration | Description
- | -
Electron: Main | Runs the app and attachs to the main (node) process.
Electron: Renderer | Attachs to the renderer (chrome) process.
Electron: All | Runs the app and attachs to both main and renderer processes.

### Packaging & CI

[Electron Builder](https://github.com/electron-userland/electron-builder) is used to generate installation packages for Windows, MacOS and Linux.

GitHub Actions are set up using [Action Electron Builder](https://github.com/samuelmeuli/action-electron-builder).

# Acknowledgements

Thanks to all the contributors of the packages I use in this project, and the help provided on [GitHub](https://github.com), [Medium](https://medium.com) and [StackOverflow](https://stackoverflow.com).

