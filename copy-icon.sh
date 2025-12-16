#!/bin/bash
echo "Copying maki2.png to public/icon.png..."
cp maki2.png public/icon.png
if [ $? -eq 0 ]; then
    echo "Icon copied successfully!"
else
    echo "Error: Failed to copy icon file."
    echo "Please manually copy maki2.png to public/icon.png"
fi

