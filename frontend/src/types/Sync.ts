export interface SyncStatus {
    started: boolean;
    registered: boolean;
    registrationServer: boolean;
    initialLoaded: boolean;
    reverseInitialLoaded: boolean;
    syncEnabled: boolean;
    batchToSendCount: number;
    batchInErrorCount: number;
    heartbeatInterval?: number;
    lastHeartbeat?: string;
    nodeId?: string;
    nodeGroupId?: string;
    createdAtNodeId?: string;
    externalId?: string;
    deploymentType?: string;
    symmetricVersion?: string;
    databaseType?: string;
    databaseVersion?: string;
    registrationUrl?: string;
    syncUrl?: string;
    message?: string;
}