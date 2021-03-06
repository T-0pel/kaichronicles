/// <reference path="../external.ts" />

/**
 * Load stored game controller
 */
class loadGameController {
    
    /**  
     * The load game page 
     */
    public static index() {
        template.setNavTitle( translations.text('kaiChronicles'), '#mainMenu', true);
        template.showStatistics(false);
        views.loadView('loadGame.html').then(function() {
                
            if( !cordovaApp.isRunningApp() ) {
                // Web page environment:
                loadGameView.hideFilesList();
                loadGameView.bindFileUploaderEvents();
            }
            else {
                // Cordova app files list
                loadGameView.hideFileUpload();
                loadGameView.bindAppEvents();
                loadGameController.listGameFiles();
            }

        });
    }

    /**
     * Get a set a of file system entries, and return the names of those that are files
     * @param entries {Array<Entry>} Filesystem entries to check
     * @returns The file names
     */
    private static getFileNames( entries : Array<any> ) : Array<string> {
        
        // Get file names (entries is Array<Entry>)
        let fileNames : Array<string> = [];
        for(let entry of entries) {
            // There can be directories here (ex. downloaded books)
            if( entry.isFile )
                fileNames.push( entry.name );
        }

        return fileNames;
    }

    /**
     * Fill the Cordova app saved games list
     */
    private static listGameFiles() {
        loadGameView.clearFilesList();

        // Get files on the root directory of the persistent storage
        cordovaFS.requestFileSystemAsync()
        .then(function( fileSystem /* : FileSystem */ ) {
            return cordovaFS.getRootFilesAsync( fileSystem );
        })
        .then( function(entries : Array<any> ) {

            // Get file names (entries is Array<Entry>)
            let fileNames = loadGameController.getFileNames(entries);

            // The list may be unsorted:
            fileNames.sort();
            loadGameView.addFilesToList( fileNames );
            loadGameView.bindListEvents();
        })
        .fail(function( error : any ) {
            // TODO: Test this
            let msg = 'Error retrieving saved games list';
            if( error )
                msg += ': ' + error.toString();
            alert( error );
        });
    }

    /** 
     * Called when the selected file changes (only web)
     * @param fileToUpload The selected file
     */
    public static fileUploaderChanged(fileToUpload : Blob) {
        try {
            var reader = new FileReader();
            reader.onload = function (e) {
                loadGameController.loadGame( (<any>e.target).result );
            };
            reader.readAsText(fileToUpload);
        }
        catch(e) {
            console.log(e);
            loadGameView.showError( e.toString() );
        }
    }

    /**
     * Called when a file is selected (Android only)
     */
    public static fileListClicked(fileName : string) {
        cordovaFS.readRootTextFileAsync( fileName )
        .then(
            function( fileContent : string ) {
                loadGameController.loadGame( fileContent );
            },
            function( error : any ) {
                let msg = 'Error loading saved game';
                if( error )
                    msg += ': ' + error.toString();
                alert( msg );
            }
        );
    }

    /**
     * Load saved game and start to play it
     * @param jsonState The saved game file content
     */
    private static loadGame(jsonState : string) {
        try {
            state.loadSaveGameJson( jsonState );
            routing.redirect('setup');
        }
        catch(e) {
            console.log(e);
            if( cordovaApp.isRunningApp() )
                alert(e.toString());
            else
                loadGameView.showError( e.toString() );
        }
    }

    /**
     * Delete a saved game (Android only)
     * @param fileName The file name to delete
     */
    public static deleteFile(fileName : string) {
   
        cordovaFS.requestFileSystemAsync()
        .then( function( fs /* : FileSystem */ ) {
            return cordovaFS.getFileAsync( fs.root , fileName );
        })
        .then( function( fileEntry /* : FileEntry */ ) {
            return cordovaFS.deleteFileAsync( fileEntry );
        })
        .done( function() {
            toastr.success( translations.text( 'fileDeleted' , [ fileName ] ) );
            loadGameView.removeFilenameFromList( fileName );
        })
        .fail( function( error ) {
            let msg = 'Error deleting file';
            if( error )
                msg += ': ' + error.toString();
            alert( msg );
        });
    }

    /**
     * Export saved games to Downloads file (Android only)
     */
    public static exportSavedGames() {
        try {

            if( !confirm( translations.text( 'confirmExport' ) ) )
                return;

            new SavedGamesExport().export()
            .then( 
                function() {
                    // OK
                    toastr.success( translations.text( 'exportedDownloads' ) );
                },
                function( error ) {
                    // ERROR
                    let msg = translations.text( 'errorExporting' );
                    if( error )
                        msg += ': ' + error.toString();
                    alert( msg );
                }
            );
        }
        catch(e) {
            console.log(e);
            alert( translations.text( 'errorExporting' ) + ': ' + e.toString() );
        }
    }

    /**
     * Import saved games from a zip file
     */
    public static importSavedGames() {
        try {

            alert( translations.text( 'infoImport' ) );

            const importProcess = new SavedGamesExport();
            DocumentSelection.selectDocument()
            .then(function(doc : DocumentSelection) {
                return importProcess.import(doc);
            })
            .then( 
                function() {
                    // OK
                    toastr.success( translations.text( 'importedGames' , [ importProcess.nImportedGames ] ) );
                    // Refresh games list
                    loadGameController.listGameFiles();
                },
                function( error : any ) {
                    // ERROR
                    let msg = 'Error importing saved games';
                    if( error )
                        msg += ': ' + error.toString();
                    alert( msg );
                }
            );
        }
        catch(e) {
            console.log(e);
            alert( 'Error importing: ' + e.toString() );
        }
    }

    /** Return page */
    public static getBackController() { return 'mainMenu'; }
    
};