# BIOS-CAT README
[![Marketplace](https://vsmarketplacebadge.apphb.com/version/Cat-Master-Arvin.BIOS-CAT.svg)](https://vsmarketplacebadge.apphb.com/version/Cat-Master-Arvin.BIOS-CAT.svg)
[![Installs](https://vsmarketplacebadge.apphb.com/installs-short/Cat-Master-Arvin.BIOS-CAT.svg)](https://vsmarketplacebadge.apphb.com/installs-short/Cat-Master-Arvin.BIOS-CAT.svg)
[![Downloads](https://vsmarketplacebadge.apphb.com/downloads-short/Cat-Master-Arvin.BIOS-CAT.svg)](https://vsmarketplacebadge.apphb.com/downloads-short/Cat-Master-Arvin.BIOS-CAT.svg)
[![Rating](https://vsmarketplacebadge.apphb.com/rating-short/Cat-Master-Arvin.BIOS-CAT.svg)](https://vsmarketplacebadge.apphb.com/rating-short/Cat-Master-Arvin.BIOS-CAT.svg)

    This is a extension Can make BIOS engineer more convenient.

    Of course, some of function also good to use even you are not BIOS engineer.🤪

## Features
<h2 id="0" style="color:#c96b00;">Hot-Key.</h2>

  ## `Provide hot-key as below.`
  **Hot-Key**           |**Description**
  ----------------------|--------------------------------------
  **1. `ALT+P`**        | Copy current file full path.
  **2. `ALT+[`**        | Copy current file folder path.
  **3. `ALT+]`**        | Copy current file name.
  **4. `ALT+m`**        | Add [Bookmark](#1).
  **5. `ALT+q`**        | Generate patch [By Input SID](#1).
  **6. `ALT+r`**        | Start [Record log](#3). (not yet😛.)
  **7. `CTRL+SHIFT+d`** | Search with [Memory map seeker](#4).

<h2 id="1" style="color:#c96b00;">Bookmark.</h2>

  * `Provide bookmark for user can mark their step or something need to record.`

  1. You can group bookmarks, make it no longer cluttered.
  2. You can edit item name whatever you want.
  3. BIOS-CAT will also record time when you create book mark.
  4. Of course you can user book mark jump to the please that you record.

     ![BookmarkImage](https://lh3.googleusercontent.com/gYVYDso4aZWPBjOy8QfpT1hNgqbaBhcZSw6w-Nxook9ZPXxRuf0FmA3RQowMYm1k2mWCM0z3ImPpKwtMrOIxZdC1GvYznbUjx30KVVFs2cZ6AK0_MuI__ucX62F8gGGmCf3ilPesJw=w800)
  5. If you use git to manage your code, now you can get the change patch of
     the row that you select(click right mouse button then select "🐈5_Get this row change")
     or use ALT+Q to input SID to get it.
     (Patch will generate at "{Workspace}/.vscode/Patch". Can change path in extension setting)

     ![GitPackageImage](https://lh3.googleusercontent.com/077OLhzFZrnNQ75BsA-VA-r-uAwMsQP-v-M-w0N7jmXRafs0MIpVV1igYWPfAinDTp73rySoU2R7weQkritdIMuxfKoQy--4MVrlCYVf36JIOqy7OE1m9_s7CoUxjVcd2ug2IrPJrw=w800)

<h2 id="2" style="color:#c96b00;">Build code button.</h2>

  * `Provide space that can let user save build command, convenient to use ~`

  1. Build code as Release / Debug / FSP-API release /FSP-API debug.
  2. Clean up workspace.
  3. Provide button that can click to jump to build error.
  4. Build single module that can reduce time spend with build error debug.

     ![BuildImage]("")

<h2 id="3" style="color:#c96b00;">Embedded putty.</h2>

  * To-Do

     ![ToDoImage](https://lh3.googleusercontent.com/xeHF3nSsFNZouoBa20RARnZIhCLE6BKjEQzPH5E43Q_9DCB8xy-JILacauBf2sOKBt_jeUp0gfFJcsmpOstS7f4-Mcoy3rqlUEWyyBP8zQfY_azRsFhrCiSv0QoSAms2RHejPCj-zg=w600)

<h2 id="4" style="color:#c96b00;">Memory map seeker.</h2>

  * `Provide driver memory map seeker to let you know:`

  1. What driver actually execute on your platform.
  2. The driver actual memory address and size on your platform.
  3. The function address offset in driver & where it reference.
  4. What protocol will actual install in driver and it's memory address (Support with newest EDK2).

     ![MapImage01]("")
  5. Provide button that you can use "String"(name or GUID .etc) to search driver or
     use "Address" to find it's located at which driver.
  6. Provide button that you can fast copy Address, GUID or driver/function/protocol name.

     ![MapImage02]("")

<h2 id="5" style="color:#c96b00;">[Self-Certification Test(SCT) tool ]</h2>

  * `Clone SCT & EDK from github:` Help user can auto clone code from github.
  * `One click build SCT:` Let user can build SCT more easy.

<h2 id="6" style="color:#c96b00;">[Ported from other side]</h2>

  * `Reference from EDK2-vscode:` FDF/DEC/INF/VFR/HFR Parser.


## Requirements

* Need to install [Python](https://www.python.org/)
* Need to install [Git](https://git-scm.com/)

## Extension Settings

    All setting have illustrate in extension settings !!
    Please click `the icon [⚙️] in top area` to see them.

## Bug fix

  1. Fix git can not generate patch at multi workspace.
  2. Deleted files now will be generated into patch.

## Known Issues

  1. First time use "Build with single module" need to click twice time.


## END OF NOTES
-----------------------------------------------------------------------------------------------------------