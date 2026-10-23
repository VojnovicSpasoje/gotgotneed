package app.gotgotneed;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Saves a backup file like a normal download: straight into the phone's Downloads folder
 * (Android 10+, no permission needed). On older Android the system "Save as" window opens instead.
 */
@CapacitorPlugin(name = "SaveFile")
public class SaveFilePlugin extends Plugin {
    @PluginMethod
    public void save(PluginCall call) {
        String name = call.getString("name", "backup.json");
        String data = call.getString("data", "");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues v = new ContentValues();
            v.put(MediaStore.Downloads.DISPLAY_NAME, name);
            v.put(MediaStore.Downloads.MIME_TYPE, "application/json");
            v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
            Uri uri = getContext().getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
            if (uri == null) { call.reject("Could not create the file"); return; }
            if (write(uri, data)) { JSObject r = new JSObject(); r.put("where", "Downloads"); call.resolve(r); }
            else call.reject("Could not write the file");
            return;
        }
        Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.setType("application/json");
        i.putExtra(Intent.EXTRA_TITLE, name);
        startActivityForResult(call, i, "picked");
    }

    @ActivityCallback
    private void picked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) { call.reject("cancelled"); return; }
        if (write(result.getData().getData(), call.getString("data", ""))) { JSObject r = new JSObject(); r.put("where", "chosen folder"); call.resolve(r); }
        else call.reject("Could not write the file");
    }

    private boolean write(Uri uri, String data) {
        try (OutputStream os = getContext().getContentResolver().openOutputStream(uri)) {
            if (os == null) return false;
            os.write(data.getBytes(StandardCharsets.UTF_8));
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
