# BIOS-CAT README
[![Marketplace](https://vsmarketplacebadge.apphb.com/version/Cat-Master-Arvin.BIOS-CAT.svg)](https://vsmarketplacebadge.apphb.com/version/Cat-Master-Arvin.BIOS-CAT.svg)
[![Installs](https://vsmarketplacebadge.apphb.com/installs-short/Cat-Master-Arvin.BIOS-CAT.svg)](https://vsmarketplacebadge.apphb.com/installs-short/Cat-Master-Arvin.BIOS-CAT.svg)
[![Downloads](https://vsmarketplacebadge.apphb.com/downloads-short/Cat-Master-Arvin.BIOS-CAT.svg)](https://vsmarketplacebadge.apphb.com/downloads-short/Cat-Master-Arvin.BIOS-CAT.svg)
[![Rating](https://vsmarketplacebadge.apphb.com/rating-short/Cat-Master-Arvin.BIOS-CAT.svg)](https://vsmarketplacebadge.apphb.com/rating-short/Cat-Master-Arvin.BIOS-CAT.svg)

This is a extension Can make BIOS engineer more convenient.

Of course, some of function also good to use even you are not a BIOS engineer :)

## Features
<h2 id="0">Hot-Key.</h2>

  1. `ALT+P`        : Copy current file full path.
  2. `ALT+[`        : Copy current file folder path.
  3. `ALT+]`        : Copy current file name.
  4. `ALT+m`        : Add [Bookmark](#1).
  5. `ALT+r`        : Start [Record log](#3).
  6. `CTRL+SHIFT+d` : Search with [Memory map seeker](#4).

<h2 id="1">Bookmark.</h2>

  Provide bookmark for user can mark their step or something need to record.

  1. You can group bookmarks, make it no longer cluttered.
  2. You can edit item name whatever you want.
  3. BIOS-CAT will also record time when you create book mark.
  4. Of course you can user book mark jump to the please that you record.

<h2 id="2">Build code button.</h2>

  Provide space that can let user save build command, convenient to use ~

  1. Build code as Release / Debug / FSP-API release /FSP-API debug.
  2. Clean up workspacce.
  3. Provide button that can click to jump to build error.
  4. Build single module that can reduce time spend with build error debug.

<h2 id="3">Embedded putty.</h2>

  To-Do

<h2 id="4">Memory map seeker.</h2>

  Provide driver memory map seeker to let you know:

  1. What driver actually execute on your platform.
  2. The driver actual memory address and size on your platform.
  3. The function address offset in driver & where it reference.
  4. What protocol will actual install in dirver and it's memory address.
  5. Provide button that you can use "String"(name or GUID .etc) to search driver or 
     use "Address" to find it's located at which driver.
  6. Provide button that you can fase copy Address, GUID or driver/function/protocol name.

## Requirements

* Need to install [Python](https://www.python.org/)

## Extension Settings

All setting have illustrate with item !!

## Known Issues

 1. First time use "Build with single module" neet to click twice time.

## Release Notes

Please reference [Here!!](./Task.md)


## END OF NOTES
-----------------------------------------------------------------------------------------------------------