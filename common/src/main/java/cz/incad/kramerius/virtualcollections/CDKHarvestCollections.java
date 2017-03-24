package cz.incad.kramerius.virtualcollections;

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.logging.Logger;

import javax.ws.rs.core.MediaType;

import org.json.JSONArray;
import org.json.JSONObject;

import com.sun.jersey.api.client.Client;
import com.sun.jersey.api.client.WebResource;

import cz.incad.kramerius.FedoraAccess;
import cz.incad.kramerius.impl.FedoraAccessImpl;
import cz.incad.kramerius.utils.conf.KConfiguration;
import cz.incad.kramerius.virtualcollections.CDKProcessingIndex.Type;
import cz.incad.kramerius.virtualcollections.impl.CDKProcessingIndexImpl;
import cz.incad.kramerius.virtualcollections.impl.fedora.FedoraCollectionsManagerImpl;

public class CDKHarvestCollections {
	
	
	public static final Logger LOGGER = Logger.getLogger(CDKHarvestCollections.class.getName());
	
    public static void main(String[] args) throws CDKProcessingIndexException, IOException, InterruptedException {
    	FedoraAccess fedoraAccess = new FedoraAccessImpl(KConfiguration.getInstance(), null);
    	FedoraCollectionsManagerImpl fedoraColManager = new FedoraCollectionsManagerImpl();
    	fedoraColManager.setFedoraAccess(fedoraAccess);
    	
    	CDKProcessingIndex procIndex = new CDKProcessingIndexImpl();

    	JSONArray jsArr = procIndex.getDataByType(CDKProcessingIndex.Type.source);
        for (int i = 0,ll=jsArr.length(); i < ll; i++) {
            JSONObject json = jsArr.getJSONObject(i);
            String url = json.getString("url");
            JSONArray collection = getCollection(json.getString("pid"), url);
            for (int j = 0,lj=collection.length(); j < lj; j++) {
                JSONObject col = collection.getJSONObject(j);

                boolean cleave = col.getBoolean("canLeave");
                String pid = col.getString("pid");
                
                if (!fedoraColManager.exists(pid)) {
                    Map<String, String> names = new HashMap<String, String>();
                    Set keySet = col.keySet();
                    for (Object ok : keySet) {
    					String key = ok.toString(); 
    					if (key.startsWith("description_txt_")) {
    						String langCode = key.substring("description_txt_".length());
    						names.put(langCode, col.getString(key));
    					}
                    }
                    LOGGER.info("Creating remote virtual collection in the fedora repository "+pid);
                    CollectionUtils.create(pid, fedoraAccess, null, cleave, names, new CollectionUtils.CollectionManagerWait(fedoraColManager));
                } else {
                    LOGGER.info("Virtual collection in the repository already exist "+pid);
                	
                }

                LOGGER.info("Indexing virtual collection in the fedora repository "+pid);
                	
                // should be somehow handled because of transaction
                procIndex.index(Type.collection, col);
            }
        }
    }


    
    public static JSONArray getCollection(String parent, String base) throws UnsupportedEncodingException {
        JSONArray retVal = new JSONArray();
        
        Client c = Client.create();
        WebResource r = c.resource(base+(base.endsWith("/") ? "" : "/") +"api/v5.0/vc");
        String t = r.accept(MediaType.APPLICATION_JSON).type(MediaType.APPLICATION_JSON).get(String.class);

        JSONArray jArr = new JSONArray(t);
        for (int i = 0,ll=jArr.length(); i < ll; i++) {
            JSONObject jsonObject = jArr.getJSONObject(i);

            JSONObject nVal = new JSONObject();
            nVal.put("parent", parent);
            nVal.put("pid", jsonObject.getString("pid"));
            nVal.put("canLeave", jsonObject.getBoolean("canLeave"));
            nVal.put("name", jsonObject.getString("pid"));
            nVal.put("type", Type.collection.name());
            nVal.put("description_txt_en", jsonObject.getJSONObject("descs").getString("en"));
            nVal.put("description_txt_cs", jsonObject.getJSONObject("descs").getString("cs"));
            nVal.put("path", parent+"/"+jsonObject.getString("pid"));
            retVal.put(nVal);
            
        }
        return retVal;
    }

}
