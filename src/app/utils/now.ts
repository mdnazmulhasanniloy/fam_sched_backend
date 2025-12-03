import moment from 'moment';

const now = (date?: any) => (date ? moment(date).utc() : moment().utc());
export default now;
