import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('meetings')
export class Meeting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    publicId: string;

    @Column()
    title: string;

    @Column()
    hostId: string;

    @Column({ default: true })
    waitingRoomEnabled: boolean;

    @Column({ default: true })
    allowGuests: boolean;

    @Column({ default: false })
    recordingEnabled: boolean;

    @Column({ default: 50 })
    maxParticipants: number;

    @CreateDateColumn()
    createdAt: Date;
}

