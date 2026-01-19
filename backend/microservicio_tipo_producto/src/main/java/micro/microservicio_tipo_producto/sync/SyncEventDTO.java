package micro.microservicio_tipo_producto.sync;

import lombok.Data;

@Data
public class SyncEventDTO {
    private String originNodeId;
    private String entityType;
    private String action;
    private String contentJson;
    private Long timestamp;
}