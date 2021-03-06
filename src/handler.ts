import {
    IDisposable
} from '@phosphor/disposable';

import {
    IVariableInspector
} from './variableinspector';

import {
    KernelConnector
} from "./kernelconnector";

import {
    IClientSession
} from "@jupyterlab/apputils";

import {
    KernelMessage
} from "@jupyterlab/services";

import {
    Signal, ISignal
} from "@phosphor/signaling"

import {
    nbformat
} from "@jupyterlab/coreutils"

import {
    JSONModel, DataModel
} from "@phosphor/datagrid";
import { JSONObject } from '@phosphor/coreutils';


export
    interface IWithData extends JSONObject {
        /**
         * Type of cell output.
         */
        data: string;
    }

/**
 * An object that handles code inspection.
 */
export
    class VariableInspectionHandler implements IDisposable, IVariableInspector.IInspectable {

    private _connector: KernelConnector;
    private _queryCommand: string;
    private _initScript: string;
    private _matrixQueryCommand: string;
    private _disposed = new Signal<this, void>( this );
    private _inspected = new Signal<this, IVariableInspector.IVariableInspectorUpdate>( this );
    private _isDisposed = false;
    private _ready : Promise<void>;
    

    constructor( options: VariableInspectionHandler.IOptions ) {
        this._connector = options.connector;
        this._queryCommand = options.queryCommand;
        this._matrixQueryCommand = options.matrixQueryCommand;
        this._initScript = options.initScript;

        this._ready =  this._connector.ready.then(() => {
            this._initOnKernel().then(( msg:KernelMessage.IExecuteReplyMsg ) => {
            this._connector.iopubMessage.connect( this._queryCall );
            return;

            } );
        } );
        
    }

    /**
     * A signal emitted when the handler is disposed.
     */
    get disposed(): ISignal<VariableInspectionHandler, void> {
        return this._disposed;
    }

    get isDisposed(): boolean {
        return this._isDisposed;
    }
    
    get ready():Promise<void>{
        return this._ready;
    }
    

    /**
     * A signal emitted when an inspector value is generated.
     */
    get inspected(): ISignal<VariableInspectionHandler, IVariableInspector.IVariableInspectorUpdate> {
        return this._inspected;
    }

    /**
     * Performs an inspection by sending an execute request with the query command to the kernel.
     */
    public performInspection(): void {
        let request: KernelMessage.IExecuteRequest = {
            code: this._queryCommand,
            stop_on_error: false,
            store_history: false,
        };
        this._connector.fetch( request, this._handleQueryResponse );
    }

    /**
     * Performs an inspection of the specified matrix.
     */

    public performMatrixInspection( varName: string, scope='global', maxRows=100000 ): Promise<DataModel> {
        let code = this._matrixQueryCommand + "(" + varName + ", scope=\"" + scope + "\", maxrows=" + maxRows + ")";
        if (scope == 'local') {
            code = this._matrixQueryCommand + "(\"" + varName + "\", scope=\"" + scope + "\", maxrows=" + maxRows + ")";
        }

        let request: KernelMessage.IExecuteRequest = {
            code: code,
            stop_on_error: false,
            store_history: false,
        };
        let con = this._connector;
        return new Promise( function( resolve, reject ) {
            con.fetch( request,
                ( response: KernelMessage.IIOPubMessage ) => {
                    let msgType = response.header.msg_type;
                    switch ( msgType ) {
                        case "execute_result":
                            let payload = response.content as nbformat.IExecuteResult;
                            let content: string = <string>payload.data["text/plain"];
                            let modelOptions = <JSONModel.IOptions>JSON.parse( content.replace( /^'|'$/g, "" ) );
                            let jsonModel = new JSONModel( modelOptions );
                            resolve( jsonModel );
                            break;
                        case "error":
                            console.log(response);
                            reject( "Kernel error on 'matrixQuery' call!" );
                            break;
                        default:
                            break;
                    }
                }
            );
        } );
    }


    /*
     * Disposes the kernel connector.
     */
    dispose(): void {
        if ( this.isDisposed ) {
            return;
        }
        this._isDisposed = true;
        this._disposed.emit( void 0 );
        Signal.clearData( this );
    }



    /**
     * Initializes the kernel by running the set up script located at _initScriptPath.
     * TODO: Use script based on kernel language.
     */
    private _initOnKernel(): Promise<KernelMessage.IExecuteReplyMsg> {
        let request: KernelMessage.IExecuteRequest = {
            code: this._initScript,
            stop_on_error: false,
            silent: true,
        };

        let reply: Promise<KernelMessage.IExecuteReplyMsg> = this._connector.fetch( request, ( () => { } ) );
        return reply;

    }



    /*
     * Handle query response. Emit new signal containing the IVariableInspector.IInspectorUpdate object.
     * (TODO: query resp. could be forwarded to panel directly)
     */
    private _handleQueryResponse = ( response: KernelMessage.IIOPubMessage ): void => {
        let msgType = response.header.msg_type;
        switch ( msgType ) {
            case "execute_result":
                let payload = response.content as nbformat.IExecuteResult;
                let content: string = <string>payload.data["text/plain"];
                content = content.replace( /^'|'$/g, '' ).replace( /\\"/g, "\"" ).replace( /\\'/g, "\'" );

                let update: IVariableInspector.IVariableInspectorUpdate;
                update = <IVariableInspector.IVariableInspectorUpdate>JSON.parse( "{\"is_input\": false, \"values\": " + content + "}" );

                this._inspected.emit( update );
                break;
            default:
                break;
        }
    };


    /*
     * Invokes a inspection if the signal emitted from specified session is an 'execute_input' msg.
     */
    private _queryCall = ( sess: IClientSession, msg: KernelMessage.IMessage ) => {
        let msgType = msg.header.msg_type;
        switch ( msgType ) {
            case 'execute_input':
                let code = msg.content.code;
                if ( !( code == this._queryCommand ) && !( code == this._matrixQueryCommand ) ) {
                    this.performInspection();
                }
                break;
            case 'variableinspector':
                let payload = msg.content as IWithData;
                let content: string = <string>payload.data;
                content = content.replace( /^'|'$/g, '' ).replace( /\\"/g, "\"" ).replace( /\\'/g, "\'" );

                let update: IVariableInspector.IVariableInspectorUpdate;
                update = <IVariableInspector.IVariableInspectorUpdate>JSON.parse( "{\"is_input\": true, \"values\": " + content + "}" );

                this._inspected.emit( update );
                break;
            default:
                break;
        }
    };


}

/**
 * A name space for inspection handler statics.
 */
export
namespace VariableInspectionHandler {
    /**
     * The instantiation options for an inspection handler.
     */
    export
        interface IOptions {
        connector: KernelConnector;
        queryCommand: string;
        matrixQueryCommand: string;
        initScript: string;
    }
}



