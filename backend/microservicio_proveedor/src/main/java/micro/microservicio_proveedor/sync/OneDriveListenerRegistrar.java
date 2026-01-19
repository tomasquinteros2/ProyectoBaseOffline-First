// java
package micro.microservicio_proveedor.sync;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

// @Component
@RequiredArgsConstructor
@Slf4j
public class OneDriveListenerRegistrar {

    private final SyncProperties syncProperties;

    // @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        // Al arrancar, inyectar la bean en el listener JPA (para listeners creados por JPA fuera de Spring)
        OneDriveListener.setSyncProperties(syncProperties);
        log.info("✅ OneDriveListener registrado con SyncProperties (nodeId={})", syncProperties.getNodeId());
    }
}
