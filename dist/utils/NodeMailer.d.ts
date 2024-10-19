export interface Email {
    to: string;
    text: string;
    subject: string;
    html: string;
}
declare const NodeMailer: (data: Email) => Promise<void>;
export default NodeMailer;
