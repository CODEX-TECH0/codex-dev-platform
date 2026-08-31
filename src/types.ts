export type Status='Ready'|'Building'|'Queued'|'Failed'|'Cancelled';
export type Project={id:string;name:string;framework:string;repository:string;environment:string;status:Status;updated:string;archived?:boolean};
export type Task={id:string;title:string;status:'Backlog'|'Todo'|'In Progress'|'Review'|'Done';priority:'Low'|'Medium'|'High'|'Critical';assignee:string;labels:string[]};
export type Key={id:string;name:string;prefix:string;created:string;lastUsed:string;revoked?:boolean};
export type Notice={id:string;title:string;detail:string;read:boolean;kind:'success'|'warning'|'info'};
