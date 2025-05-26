# Extension Icon

This directory is intended for the extension icon.

## Requirements

- **Format**: PNG
- **Size**: 128x128 pixels (256x256 for Retina displays)
- **Name**: `icon.png`

## Design Guidelines

The icon should represent the extension's functionality:
- Java development (coffee cup symbol)
- Navigation/linking (arrow or connection symbol)
- Configuration files (document/file symbol)

## Suggested Design Elements

1. **Java Coffee Cup**: Represents Java development
2. **Arrow/Navigation**: Shows the navigation functionality
3. **Document/File**: Represents configuration files
4. **Blue Color Scheme**: Matches VS Code's theme (#007ACC)

## Adding the Icon

1. Create or obtain a 128x128 PNG icon
2. Save it as `icon.png` in this directory
3. Update `package.json` to include:
   ```json
   "icon": "./icons/icon.png"
   ```

## Online Icon Creation Tools

- [Canva](https://www.canva.com/)
- [GIMP](https://www.gimp.org/)
- [Figma](https://www.figma.com/)
- [IconFinder](https://www.iconfinder.com/)

## SVG to PNG Conversion

If you have an SVG icon, you can convert it to PNG using:
- [SVG to PNG Online](https://svgtopng.com/)
- [CloudConvert](https://cloudconvert.com/svg-to-png)
- [Online-Convert](https://image.online-convert.com/convert/svg-to-png)

Remember to set the output size to 128x128 pixels for optimal quality. 