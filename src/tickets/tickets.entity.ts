import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TicketStatus } from './ticket-status.enum';
import { User } from 'src/users/users.entity';

@Entity()
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  eventId: string;

  @Column()
  seatNumber: string;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.AVAILABLE,
  })
  status: TicketStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reservedBy' })
  reservedBy?: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'lockOwner' })
  lockOwner?: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  lockExpiresAt?: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
