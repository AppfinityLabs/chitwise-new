import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    email: string;
    username?: string;
    password: string;
    name: string;
    phone?: string;
    role: 'SUPER_ADMIN' | 'ORG_ADMIN';
    organisationId?: mongoose.Types.ObjectId;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
        },
        // Optional login name; can be used instead of the email to sign in
        username: {
            type: String,
            lowercase: true,
            trim: true,
            match: [/^[a-z0-9._-]{3,30}$/, 'Username must be 3-30 characters: letters, numbers, . _ -']
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters']
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true
        },
        phone: {
            type: String,
            trim: true,
            sparse: true
        },
        role: {
            type: String,
            enum: ['SUPER_ADMIN', 'ORG_ADMIN'],
            default: 'ORG_ADMIN'
        },
        organisationId: {
            type: Schema.Types.ObjectId,
            ref: 'Organisation'
        },
        status: {
            type: String,
            enum: ['ACTIVE', 'INACTIVE'],
            default: 'ACTIVE'
        }
    },
    {
        timestamps: true
    }
);

// Create indexes
UserSchema.index({ email: 1 });
UserSchema.index(
    { username: 1 },
    { unique: true, partialFilterExpression: { username: { $type: 'string' } } }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
