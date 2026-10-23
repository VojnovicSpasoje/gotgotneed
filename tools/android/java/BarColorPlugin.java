package app.gotgotneed;

import android.graphics.Color;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Paints the area behind the status and navigation bars in the app theme's background colour. */
@CapacitorPlugin(name = "BarColor")
public class BarColorPlugin extends Plugin {
    @PluginMethod
    public void set(PluginCall call) {
        String value = call.getString("color", "");
        final int color;
        try { color = Color.parseColor(value); } catch (IllegalArgumentException e) { call.reject("Not a colour: " + value); return; }
        getActivity().runOnUiThread(() -> {
            getActivity().getWindow().getDecorView().setBackgroundColor(color);
            getBridge().getWebView().setBackgroundColor(color);
            call.resolve();
        });
    }
}
