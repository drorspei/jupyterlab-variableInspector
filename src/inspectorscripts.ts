export
namespace Languages {
    export
        type LanguageModel = {
            initScript: string;
            queryCommand: string;
            matrixQueryCommand: string;
        }
}

export
    abstract class Languages {
    /**
     * Init and query script for supported languages.
     */

    static py_script: string = `import json
import pdb
import inspect
from sys import getsizeof
from IPython import get_ipython
from IPython.core.magics.namespace import NamespaceMagics


_jupyterlab_variableinspector_nms = NamespaceMagics()
_jupyterlab_variableinspector_Jupyter = get_ipython()
_jupyterlab_variableinspector_nms.shell = _jupyterlab_variableinspector_Jupyter.kernel.shell

try:
    import numpy as np
except ImportError:
    np = None

try:
    import pandas as pd
except ImportError:
    pd = None

try:
    import pyspark
except ImportError:
    pyspark = None

try:
    import tensorflow as tf
    import keras.backend as K
except ImportError:
    tf = None


def _jupyterlab_variableinspector_getsizeof(x):
    if type(x).__name__ in ['ndarray', 'Series']:
        return x.nbytes
    elif pyspark and isinstance(x, pyspark.sql.DataFrame):
        return "?"
    elif tf and isinstance(x, tf.Variable):
        return "?"
    elif pd and type(x).__name__ == 'DataFrame':
        return x.memory_usage().sum()
    else:
        return getsizeof(x)


def _jupyterlab_variableinspector_getshapeof(x):
    if pd and isinstance(x, pd.DataFrame):
        return "DataFrame [%d rows x %d cols]" % x.shape
    if pd and isinstance(x, pd.Series):
        return "Series [%d rows]" % x.shape
    if np and isinstance(x, np.ndarray):
        shape = " x ".join([str(i) for i in x.shape])
        return "Array [%s]" %  shape
    if pyspark and isinstance(x, pyspark.sql.DataFrame):
        return "Spark DataFrame [? rows x %d cols]" % len(x.columns)
    if tf and isinstance(x, tf.Variable):
        shape = " x ".join([str(int(i)) for i in x.shape])
        return "Tensorflow Variable [%s]" % shape
    return None


def _jupyterlab_variableinspector_getcontentof(x):
    # returns content in a friendly way for python variables
    # pandas and numpy
    if pd and isinstance(x, pd.DataFrame):
        colnames = ', '.join(x.columns.map(str))
        content = "Column names: %s" % colnames 
    elif pd and isinstance(x, pd.Series):
        content = "Series [%d rows]" % x.shape      
    elif np and isinstance(x, np.ndarray):
        content = x.__repr__()
    else:
        content = str(x)
    if len(content) > 150:
        return content[:150] + " ..."
    else:
        return content


def _jupyterlab_variableinspector_is_matrix(x):
    # True if type(x).__name__ in ["DataFrame", "ndarray", "Series"] else False
    if pd and isinstance(x, pd.DataFrame):
        return True
    if pd and isinstance(x, pd.Series):
        return True
    if np and isinstance(x, np.ndarray):
        return True
    if pyspark and isinstance(x, pyspark.sql.DataFrame):
        return True
    if tf and isinstance(x, tf.Variable):
        return True
    return False


def _jupyterlab_variableinspector_just_list():
    def keep_cond(v):
        ev = eval(v)
        if isinstance(ev, str):
            return True
        if tf and isinstance(ev, tf.Variable):
            return True
        if str(ev)[0] == "<":
            return False
        if  v in ['np', 'pd', 'pyspark', 'tf']:
            return ev is not None
        if str(ev).startswith("_Feature"):
            # removes tf/keras objects
            return False
        return True
    values = _jupyterlab_variableinspector_nms.who_ls()
    vardic = [{'varName': _v, 
    'varType': type(eval(_v)).__name__, 
    'varSize': str(_jupyterlab_variableinspector_getsizeof(eval(_v))), 
    'varShape': str(_jupyterlab_variableinspector_getshapeof(eval(_v))) if _jupyterlab_variableinspector_getshapeof(eval(_v)) else '', 
    'varContent': str(_jupyterlab_variableinspector_getcontentof(eval(_v))), 
    'isMatrix': _jupyterlab_variableinspector_is_matrix(eval(_v)),
    'scope': 'global'}
        for _v in values if keep_cond(_v)]
    return vardic


def _jupyterlab_variableinspector_dict_list():
    return json.dumps(_jupyterlab_variableinspector_just_list())


def _jupyterlab_variableinspector_up_locals():
    last_pdb_frame = None
    frame = inspect.currentframe().f_back
    try:
        while frame:
            if isinstance(frame.f_locals.get('self', None), pdb.Pdb):
                last_pdb_frame = frame
            elif last_pdb_frame is not None:
                break
            frame = frame.f_back

        if last_pdb_frame is not None:
            return last_pdb_frame.f_back.f_locals
    except:
        pass
    finally:
        del frame
        del last_pdb_frame


def _jupyterlab_variableinspector_new_raw_input(self, prompt=''):
    up_locals = _jupyterlab_variableinspector_up_locals()
    if up_locals:
        def keep_cond(v):
            try:
                if isinstance(v, str):
                    return True
                if tf and isinstance(v, tf.Variable):
                    return True
                if str(v)[0] == "<":
                    return False
                if  v in ['np', 'pd', 'pyspark', 'tf']:
                    return v is not None
                if str(v).startswith("_Feature"):
                    # removes tf/keras objects
                    return False
                return True
            except:
                return False

        vardic = []
        for key in up_locals:
            value = up_locals[key]
            if keep_cond(value):
                vardic.append({'varName': key, 
                               'varType': type(value).__name__, 
                               'varSize': str(_jupyterlab_variableinspector_getsizeof(value)), 
                               'varShape': str(_jupyterlab_variableinspector_getshapeof(value)) if _jupyterlab_variableinspector_getshapeof(value) else '', 
                               'varContent': str(_jupyterlab_variableinspector_getcontentof(value)), 
                               'isMatrix': _jupyterlab_variableinspector_is_matrix(value),
                               'scope': 'local'})
        vardic.extend(_jupyterlab_variableinspector_just_list())

        self.send_response(self.iopub_socket, u'variableinspector', {"data": json.dumps(vardic)})
    return self._old_raw_input(prompt)


def _jupyterlab_variableinspector_set_kernel_raw_input():
    k = _jupyterlab_variableinspector_Jupyter.kernel
    if k.raw_input.im_func is not _jupyterlab_variableinspector_new_raw_input:
        import types
        k._old_raw_input = k.raw_input
        k.raw_input = types.MethodType(_jupyterlab_variableinspector_new_raw_input, k)


_jupyterlab_variableinspector_set_kernel_raw_input()


def _jupyterlab_variableinspector_getmatrixcontent(x, scope="global", maxrows=10000):
    
    # to do: add something to handle this in the future
    threshold = maxrows

    if scope == "local":
        up_locals = _jupyterlab_variableinspector_up_locals()
        x = up_locals[x]

    if pd and pyspark and isinstance(x, pyspark.sql.DataFrame):
        df = x.limit(threshold).toPandas()
        return _jupyterlab_variableinspector_getmatrixcontent(df.copy())
    elif np and pd and type(x).__name__ in ["Series", "DataFrame"]:
        if threshold is not None:
            x = x.head(threshold)
        x.columns = x.columns.map(str)
        response = {"schema": pd.io.json.build_table_schema(x), "data": x.to_dict(orient="records")}
        return json.dumps(response, default=_jupyterlab_variableinspector_default)
    elif np and pd and type(x).__name__ in ["ndarray"]:
        df = pd.DataFrame(x)
        if threshold is not None:
            df = df.head(threshold)
        df.columns = df.columns.map(str)
        response = {"schema": pd.io.json.build_table_schema(df), "data": df.to_dict(orient="records")}
        return json.dumps(response,default=_jupyterlab_variableinspector_default)
    elif tf and isinstance(x, tf.Variable):
        df = K.get_value(x)
        return _jupyterlab_variableinspector_getmatrixcontent(df)

def _jupyterlab_variableinspector_default(o):
    if isinstance(o, np.number): return int(o)  
    raise TypeError
`;
    
    static scripts: { [index: string]: Languages.LanguageModel } = {
        "python3": {
            initScript: Languages.py_script,
            queryCommand: "_jupyterlab_variableinspector_dict_list()",
            matrixQueryCommand: "_jupyterlab_variableinspector_getmatrixcontent"
        },
        "python2": {
            initScript: Languages.py_script,
            queryCommand: "_jupyterlab_variableinspector_dict_list()",
            matrixQueryCommand: "_jupyterlab_variableinspector_getmatrixcontent"
        },
        "python": {
            initScript: Languages.py_script,
            queryCommand: "_jupyterlab_variableinspector_dict_list()",
            matrixQueryCommand: "_jupyterlab_variableinspector_getmatrixcontent"
        }
    };

    public static getScript( lang: string ): Promise<Languages.LanguageModel> {
        return new Promise( function( resolve, reject ) {
            if ( lang in Languages.scripts ) {
                resolve( Languages.scripts[lang] );
            } else {
                reject( "Language " + lang + " not supported yet!" );
            }
        } );

    }

}



